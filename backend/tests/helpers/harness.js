// Shared test harness for the External Job Work v2 suites (the internal suite predates it and keeps its own).
// Starts the real server on a test port, signs tokens for fixture users, and gives a tiny test runner.
//
//   const h = createHarness({ port: 3921, name: 'ejw-phase1' });
//   await h.start();                       // server + fixtures
//   await h.test('does a thing', async () => { ... });
//   await h.finish();                      // cleanup, summary, exit code
//
// Cleanup functions registered with h.onCleanup() run in reverse order, then the fixture users and
// companies are deleted, so a suite leaves nothing behind even when tests fail.

const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const pool = require('../../config/database');

function createHarness({ port, name }) {
  const tag = `ZZTEST${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const base = `http://localhost:${port}`;
  const cleanups = [];
  const failures = [];
  const created = { users: [], companies: [] };
  let passed = 0;
  let server = null;

  const token = (user) => jwt.sign({ id: user.id, role: user.role, company_id: user.company_id }, process.env.JWT_SECRET, { expiresIn: '1h' });

  // call('POST', '/api/master-customers', user, body)
  async function call(method, urlPath, user, body) {
    const res = await fetch(`${base}${urlPath}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    let json = null;
    try { json = await res.json(); } catch (_) { /* empty body */ }
    return { status: res.status, body: json };
  }

  async function mkCompany(label, extra = {}) {
    const { rows } = await pool.query(
      'INSERT INTO companies (name, gst_number, state) VALUES ($1, $2, $3) RETURNING id',
      [`${tag} ${label}`, extra.gst_number || null, extra.state || null]
    );
    created.companies.push(rows[0].id);
    return rows[0].id;
  }

  async function mkUser(role, companyId) {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password, role, company_id, is_approved)
       VALUES ($1, $2, 'x', $3, $4, true) RETURNING id, role, company_id`,
      [`${tag} ${role}`, `${tag}.${role}.${companyId}.${Math.random().toString(36).slice(2, 8)}@test.invalid`, role, companyId]
    );
    created.users.push(rows[0].id);
    return rows[0];
  }

  function startServer() {
    return new Promise((resolve, reject) => {
      server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: String(port) }, cwd: path.join(__dirname, '../..') });
      const timer = setTimeout(() => reject(new Error('server did not start')), 20000);
      server.stdout.on('data', (d) => { if (String(d).includes('Server running')) { clearTimeout(timer); resolve(); } });
      server.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));
      server.on('exit', (code) => { if (code) reject(new Error(`server exited ${code}`)); });
    });
  }

  // A second server (another port, extra environment) for tests of environment-controlled behaviour.
  function startExtraServer(extraPort, env) {
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['server.js'], { env: { ...process.env, ...env, PORT: String(extraPort) }, cwd: path.join(__dirname, '../..') });
      const timer = setTimeout(() => reject(new Error('extra server did not start')), 20000);
      child.stdout.on('data', (d) => { if (String(d).includes('Server running')) { clearTimeout(timer); resolve(child); } });
      child.on('exit', (code) => { if (code) reject(new Error('extra server exited ' + code)); });
      cleanups.push(() => child.kill());
    });
  }

  async function test(testName, fn) {
    try {
      await fn();
      passed += 1;
      console.log(`  ok   ${testName}`);
    } catch (err) {
      failures.push(testName);
      console.log(`  FAIL ${testName}\n       ${String(err.message).split('\n').slice(0, 6).join(' | ')}`);
    }
  }

  const section = (title) => console.log(`\n${title}`);
  const onCleanup = (fn) => cleanups.push(fn);

  // A statement that must fail with a Postgres error code (23514 check, 23505 unique, 23503 foreign key).
  async function assertDbError(code, sql, params = []) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql, params);
      await client.query('ROLLBACK');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
      assert.equal(err.code, code, `expected ${code}, got ${err.code}: ${err.message}`);
      return;
    }
    client.release();
    assert.fail(`expected database error ${code}, but the statement succeeded`);
  }

  async function finish() {
    if (server) server.kill();
    for (const fn of cleanups.reverse()) {
      try { await fn(); } catch (e) { console.log('  cleanup warn:', e.message); }
    }
    const q = (sql, params) => pool.query(sql, params).catch((e) => console.log('  cleanup warn:', e.message));
    await q('DELETE FROM notifications WHERE user_id = ANY($1)', [created.users]);
    await q('DELETE FROM users WHERE id = ANY($1)', [created.users]);
    await q('DELETE FROM companies WHERE id = ANY($1)', [created.companies]);
    await pool.end();
    console.log(`\n${name}: ${passed} passed, ${failures.length} failed`);
    if (failures.length) { console.log('Failed:', failures.join('; ')); process.exitCode = 1; }
  }

  return { tag, pool, assert, call, token, mkCompany, mkUser, startServer, startExtraServer, test, section, onCleanup, assertDbError, finish, created };
}

module.exports = { createHarness };
