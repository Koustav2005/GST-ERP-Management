// Status of an inward and of a work order, derived from the quantities on its items.
// Call these inside the same transaction that changed a quantity (issue to floor, ready, dispatch, cancel, short close).

const { logProjectHistory } = require('./ejw');

const STATUS_LABEL = {
  awaiting_material: 'Awaiting material', open: 'Open', in_process: 'In process', ready: 'Ready',
  partially_dispatched: 'Partially dispatched', closed: 'Closed'
};
// the projects table only allows pending / in_progress / completed / cancelled
const PROJECT_STATUS = {
  awaiting_material: 'pending', open: 'pending', in_process: 'in_progress', ready: 'in_progress',
  partially_dispatched: 'in_progress', closed: 'completed'
};

// An inward is closed when every item has been returned or short-closed.
async function recomputeInward(client, inwardId) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS n, COUNT(*) FILTER (WHERE returned_qty + short_closed_qty >= qty)::int AS done
       FROM ejw_inward_items WHERE inward_id = $1`,
    [inwardId]
  );
  const closed = rows[0].n > 0 && rows[0].n === rows[0].done;
  await client.query(
    `UPDATE ejw_inwards SET status = $2::varchar, closed_at = CASE WHEN $2::varchar = 'closed' THEN COALESCE(closed_at, CURRENT_TIMESTAMP) ELSE NULL END WHERE id = $1`,
    [inwardId, closed ? 'closed' : 'open']
  );
  return closed;
}

// awaiting_material -> open -> in_process -> ready -> partially_dispatched -> closed, from the items' quantities.
//  closed                 every item returned or short-closed
//  partially_dispatched   something has gone back
//  ready                  every item is ready (confirmed by Store) up to what is still expected
//  in_process             something has been issued to the floor
async function recomputeWorkOrder(client, woId, userId) {
  const wo = (await client.query('SELECT id, status, project_id FROM work_orders WHERE id = $1 FOR UPDATE', [woId])).rows[0];
  if (!wo) return null;
  const items = (await client.query(
    'SELECT qty, issued_qty, ready_qty, returned_qty, short_closed_qty FROM ejw_inward_items WHERE wo_id = $1', [woId]
  )).rows.map((i) => ({
    qty: Number(i.qty), issued: Number(i.issued_qty), ready: Number(i.ready_qty), returned: Number(i.returned_qty), short: Number(i.short_closed_qty)
  }));
  if (items.length === 0) return wo.status;

  const finished = (i) => i.returned + i.short >= i.qty;
  let status;
  if (items.every(finished)) status = 'closed';
  else if (items.some((i) => i.returned > 0)) status = 'partially_dispatched';
  else if (items.every((i) => finished(i) || i.ready >= i.qty - i.short)) status = 'ready';
  else if (items.some((i) => i.issued > 0 || i.ready > 0)) status = 'in_process';
  else status = 'open';

  if (status !== wo.status) {
    await client.query(
      `UPDATE work_orders SET status = $2::varchar, closed_at = CASE WHEN $2::varchar = 'closed' THEN CURRENT_TIMESTAMP ELSE NULL END,
              updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [woId, status]
    );
    if (wo.project_id) {
      await client.query('UPDATE projects SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [wo.project_id, PROJECT_STATUS[status]]);
      await logProjectHistory(client, wo.project_id, userId || null, STATUS_LABEL[wo.status], STATUS_LABEL[status], 'Work order status follows the material');
    }
  }
  return status;
}

module.exports = { recomputeInward, recomputeWorkOrder, STATUS_LABEL };
