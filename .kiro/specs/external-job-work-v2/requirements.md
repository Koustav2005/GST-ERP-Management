# External Job Work v2 — Requirements

Company: Suhitha Engineering. Internal job work v2 is done and tested; reuse its patterns and shared
pieces wherever possible. Work phase by phase; stop after each phase and wait for approval.

## 1. What external job work is

A CUSTOMER's component comes to us for a process (e.g. machining) and goes back to them.
The component belongs to the customer the whole time. We charge only for the job.
GST applies ONLY to the job charge, never to the component value.

Three scenarios. Unknown/unregistered senders are OUT OF SCOPE for now.

- **S1. Unannounced, known customer.** An existing customer sends material without informing us.
  Store learns who sent it from the customer's DC. No enquiry/PO yet. A PM creates a Work Order from
  stock. The PO arrives later.
- **S2. Bill to / ship to.** Customer X's supplier A ships to us. The e-way bill says
  "Bill to X, Ship to Suhitha", with the supplier's DC A020. Customer X's own DC/RGP (X020) arrives
  LATER. A020 is only a transport reference; X020 is what gets knocked off.
  We email X: "Received your component from <supplier> vide DC no. __ dated __, <description>,
  value Rs __. Please send your PO and DC."
- **S3. New customer, conventional.** Enquiry → NPD quotation → customer accepts → PO uploaded →
  external job work project created with a PM → status "awaiting material" → the material then
  arrives with the customer's DC, and Store inwards it AGAINST that open job.

All three converge after inward:
stock → work order → process → PM marks ready → Store confirms → Accounts makes our DC + invoice +
e-way → goods return → customer DC knocked off.

## 2. Keep / remove / add

### KEEP (reuse or fix)
- Enquiry → quotation → PO flow and the Regular / External Job Work choice in EnquiryScreen. Used for
  S3. FIX the duplicate-project bug: only upload-po creates the project; customer-review must never
  create one.
- PM material request → Store fulfil / worker QR collect (issuing customer material to the floor).
  RE-POINT it to inward items of the work order. ONE deduction path for both fulfil and collect
  (increase issued_qty on the inward item). Check available qty (received − issued) with row locks.
  Never swallow transaction errors. Keep the Store screen's confirmation behaviour.
- Shared from internal v2: stock_items + stock_item_requests (Store requests, Accounts creates/links),
  gst_rates dropdown, GSTIN-based state logic, the e-way rule (>50,000 OR interstate; 12 digits),
  tax-preview endpoint pattern, requireRole helper, notifications with ids in the data field,
  project_status_history, the withTransaction helper.
- The SE/DC/NNNN counter: SHARED with internal DCs (one series for all outgoing DCs).

### REMOVE (hide behind one flag, default hidden; don't drop tables, existing rows are test data)
- Accountant "create challan" (CHAL-<ts> numbers) and its screen.
- Store "receive challan" screen. Store's inward entry replaces it.
- Stock matched by company + material name (external_jobwork_inventory usage).
- NPD "notify material arrival" as a challan creator. It survives ONLY as an optional
  "expected material" note on an S3 project awaiting material; it creates nothing else.
- All /debug/* endpoints in external-jobwork-materials.js: delete them.

### ADD (new)
**A. Customer master.** Reuse an existing customer table if one fits; otherwise add master_customers
(company_id, name, gstin, billing address, works address, state, email, phone). Management/Accounts
maintain it. Store picks from it.

**B. Store inward entry ("Customer material received").**
- Owner customer (picker). Checkbox "Sent by a third party on behalf of the customer" (S2) → supplier
  name, supplier GSTIN, supplier DC no./date.
- Customer DC no./date: REQUIRED unless the S2 checkbox is ticked (then optional, attachable later).
- Optional "Against open job" picker: lists this customer's S3 jobs awaiting material.
- E-way bill no., vehicle no., received date (date picker), photo/scan of the DCs.
- Items: stock item (if missing → existing "Request stock item" to Accounts), HSN from the stock item,
  qty, unit, component value as declared on the customer's DC.
- Inward number SE/IN/NNNN.
- Store sees component value but NEVER job charges / invoice amounts.

**C.** "Attach customer DC" on an S2 inward (Store) + "Share acknowledgment" button that builds the S2
message above (copy/share/email).

**D. Work Orders (SE/WO/NNNN).**
- S1/S2: any PM sees "External stock awaiting work" (inward items not on a WO) and creates a WO by
  picking items from one customer. That creates a project with project_type='external_job_work' (so
  worker assignment, reports, material requests work) linked to the WO.
- S3: the WO is auto-created together with the project at PO upload, status awaiting_material.
  Inwarding "against open job" attaches the items to it.
- PM attaches drawing, quotation, inspection report, and customer PO no. + PO file whenever received.
- Statuses: awaiting_material → open → in_process → ready → partially_dispatched → closed.

**E. Mark ready.** PM marks qty ready per item, with the final inspection report → Store notified →
Store confirms the physical qty ready → Accounts notified.

**F. Accounts return dispatch (our DC + invoice).**
- BLOCK with clear messages unless: the WO has a customer PO no., and every inward used has its
  customer DC attached.
- Our DC no. from the shared SE/DC series; invoice no. SE/INV/NNNN.
- Line 1 per item: component, HSN, qty, value, quoting the customer DC no. NO GST.
- Line 2: job charge: description (e.g. "Machining"), SAC (default 998875, editable), taxable amount,
  GST rate dropdown → CGST+SGST if the customer's GSTIN state = ours, else IGST. Computed
  server-side; show a preview before saving.
- Total = component value + job charge + GST.
- E-way bill no. per the shared rule; vehicle no.; partial dispatch allowed
  (qty ≤ ready − already dispatched).
- Draft → Issued. Accounts can cancel an issued dispatch with a reason; that reverses the knock-off
  quantities.

**G. Knock-off.** Each issued dispatch increases returned_qty on its inward items. An inward closes
when all its items are returned; a WO closes when all its items are returned. Status history and
notifications (PM, Store) at each step.

**H. Reports** (Accounts + Management; Store without money columns):
- Customer material inside factory: per customer → inward → item, pending qty/value, days held,
  filters.
- Stock AS OF A DATE (e.g. 31 March): pending = received (received_date ≤ D) − returned on issued
  dispatches (dispatch date ≤ D, not cancelled). Per customer, per customer DC.
- Open customer DCs, WO status, invoices issued with the GST split.

**I. Roles.**
- Store = inward, attach DC, confirm ready, issue to floor.
- PM = WO, documents, mark ready, request material; NO money fields.
- Accounts = stock items, customers, dispatch/invoice, cancel.
- Management = everything read-only + customer master.
- Role checks on every endpoint (403); company scoping (404 for other companies); invalid
  transitions 400; duplicates 409.

## 3. Data (additive migrations in backend/migrations, same conventions as 001-007)

master_customers (if needed); ejw_inwards; ejw_inward_items (inward_id, stock_item_id, hsn, qty, unit,
unit_value, total_value, wo_id, issued_qty, ready_qty, returned_qty with CHECKs); work_orders;
ejw_dispatches (dc_no, invoice_no, date, customer snapshot incl. GSTIN, eway, vehicle, job_charge, sac,
gst_rate_id, cgst, sgst, igst, total, status, cancel_reason); ejw_dispatch_items (dispatch_id,
inward_item_id, qty, value). NUMERIC(14,2) for money, NUMERIC(12,3) for qty. Indexes on
company_id+status and customer. Back up with pg_dump before each migration; run each migration twice
to prove idempotency.

## 4. Phases (stop after each, show results, wait for OK)

- **Phase 0:** Read the existing external code (external-jobwork-materials.js, external_jobwork_*
  tables, EnquiryScreen project-type logic, the NPD/Accountant/Store/PM/Worker external screens, the
  customer data used in enquiries). Report: what exists vs this brief, the migration plan, files per
  phase, decisions needed. NO CODE.
- **Phase 1:** Migrations + customer master.
- **Phase 2:** Backend: inward (all 3 scenarios), attach DC, acknowledgment text, WO
  create/auto-create, duplicate-project fix, /debug removal.
- **Phase 3:** Backend: re-pointed issue-to-floor (single deduction path), mark ready, Store confirm,
  Accounts dispatch + invoice + cancel, knock-off, reports incl. as-of-date.
- **Phase 4:** Screens: Store (inward, attach DC, ready confirm, external stock), PM (awaiting-work
  list, WO detail, documents, mark ready), Accounts (ready-for-dispatch list, dispatch form with tax
  preview, invoices, cancel), reports. Hide the old screens via the flag.
- **Phase 5:** Full test pass + a manual click-through script for all three scenarios.

## 5. Tests (minimum)

S1 full cycle; S2 with the customer DC attached later (dispatch blocked before it); S3 inward against
an open job; no PO blocks dispatch; partial dispatch then closed; over-dispatch blocked; dispatch
cancel reverses the knock-off; CGST/SGST vs IGST from GSTIN; the AKE example (component 2,00,000 + job
charge 1,12,000 at 18% = 3,32,160, CGST 10,080 + SGST 10,080 — see note); as-of-date stock report;
issue-to-floor stock check; PM sees no money; Store sees no invoice amounts; wrong role 403; other
company 404; duplicate-project bug fixed. Tests clean up after themselves.

> Note (added during Phase 0): 18% of 1,12,000 is 20,160, so CGST 10,080 + SGST 10,080 is correct,
> and 2,00,000 + 1,12,000 + 20,160 = 3,32,160, which matches the stated total.

## 6. Decisions (confirmed after Phase 0)

1. **Customer on the enquiry:** a customer picker at enquiry upload, optional there, required when the work type is External.
2. **Number series:** `doc_sequences`, allocated inside the issuing transaction with a row lock (gapless on rollback).
   Per-series "reset each financial year (April)" setting. `SE/INV` restarts yearly, format `SE/INV/26-27/001`, at most
   16 characters (GST rule); `SE/DC`, `SE/IN`, `SE/WO` stay continuous. Internal DC creation uses it too; a typed DC number
   is checked against both DC tables.
3. **S3 PM:** the work order is created at PO upload with no PM; inward against it is allowed before a PM is assigned; the
   NPD is notified when material is inwarded against an S3 job that has no PM yet.
4. **Ready flow:** `ejw_ready_notices` holds the PM's claim; `ready_qty` is the Store-confirmed quantity.
5. **E-way rule** (>50,000 or interstate, 12 digits) applies to the dispatch total (component + job charge + GST).
6. **Two documents from one dispatch:** a DELIVERY CHALLAN (component lines, HSN, qty, value, customer DC ref, no GST) and a
   TAX INVOICE (job charge only, SAC, GST split). The taxable value is stored separately. Both are printable separately;
   the e-way details cover both. Numbers are allocated when the dispatch is issued, not at draft.
7. **Cancelled** documents keep their numbers; a number is never reused.
8. **Short-close:** Accounts only, quantity + mandatory reason, counts toward closing the inward and the work order, shown in
   reports. (Internal DCs may get the same rule later; not now.)
9. **Acknowledgment message (S2):** copy / share / mailto; no server-sent mail in v1.
10. **Old flow:** hidden behind one flag (frontend `features.js`; the old backend routes answer 410 unless enabled).
11. **Old external dev data** is kept and hidden, not dropped.

## 7. Phase 1 delivered (migrations 008-011)

- 008 `master_customers` + `enquiries.customer_id`; 009 `doc_sequences` (DC counter carried over from existing internal DCs);
  010 `work_orders`, `work_order_documents`, `ejw_inwards`, `ejw_inward_items`, `ejw_inward_documents`, `ejw_short_closes`,
  `ejw_ready_notices`, `ejw_ready_notice_items`, `ejw_dispatches`, `ejw_dispatch_items`; 011 link columns
  (`ejw_inward_item_id` on the outstock request/transaction items and on `stock_item_requests`).
- API: `/api/master-customers` (Management + Accounts write; Store, PM, NPD read), `/api/doc-sequences`.
- `utils/numbering.js` is the only place document numbers are allocated.

## 8. Decisions added after Phase 1 review

- **Invoice number format:** `SE/INV/2627/0001` (4-digit financial year, 4-digit serial, always 16 characters, 9,999 a year).
  Yearly series restart on 1 April; the yearly format of the other series is `SE/DC/2627/0001` etc.
- **Customer DC uniqueness:** unique on (company, customer, DC no, DC date). The same number on another date is allowed; a
  warning (not an error) is returned when the same number was used by that customer in the last 365 days.
- **Multiple receipts:** one customer DC may arrive in several trucks. Each truck is a receipt on the same inward, with its
  own received date, vehicle and e-way bill; every inward item belongs to a receipt. A new receipt reopens a closed inward.
- **Typed numbers (Tally):** DC and invoice numbers can be typed (at most 16 characters, letters, digits, "/" and "-"). Invoice
  numbers are unique within a financial year (`ejw_dispatches.invoice_fy`). Per company, `doc_sequences.number_source` is `app`
  (automatic, typing still allowed) or `manual` (Tally is the source; the app never invents a DC / invoice number).
  Internal DCs keep their longer 50-character limit for typed numbers.

## 9. Phase 2 delivered (migration 012)

- Inward (`/api/ejw/inwards`): S1, S2 (third party; customer DC attached later; acknowledgment text), S3 (against an open job),
  add receipt, documents, list / detail. Store only writes; Store, Accounts, Management read.
- Work orders (`/api/ejw/work-orders`, `/api/ejw/stock-awaiting-work`): PM creates from inward items (S1/S2), auto-created at PO
  upload for S3 (awaiting material, no PM), PO number, description, documents, "expected material" note, PM follows the project
  assignment. Project status is `pending` at creation (the projects table allows pending / in_progress / completed / cancelled).
- Enquiries: customer picker (optional at upload; required for External Job Work at PO upload); `customer-review` no longer
  creates projects; a second external PO for the same enquiry is refused.
- Response shapes by role: the PM and NPD never see money, Store sees the component value but no invoice amounts.
- Old flow: six `/debug` endpoints deleted (and their calls in the old Receipt screen); the challan-based routes answer 410 unless
  `LEGACY_EXTERNAL_FLOW=1`; `SHOW_LEGACY_EXTERNAL_FLOW` in `src/config/features.js` hides the old menu items.

## 10. Phase 3 delivered (no new migration)

- **Follow-ups:** global `pg` DATE parser (plain `YYYY-MM-DD`, tested on an internal DC dated 2026-10-14); a stock item request raised
  from an inward links to `ejw_inward_item_id` and shows the accountant customer, customer DC no./date, description, qty and HSN;
  the old Receipt/Challan screens are only registered when `SHOW_LEGACY_EXTERNAL_FLOW` is true.
- **Issue to floor** (`routes/ejw_issue.js`, `/api/external-jobwork-materials`): PM asks for items of his own work order only; Store
  fulfils or the worker collects by QR. Both go through one `issueRequest()`: locks the request and the inward items, checks
  `qty - issued - short_closed`, raises `issued_qty`, writes the transaction, all or nothing. No error is swallowed.
- **Ready** (`routes/ejw_ready.js`): PM claims quantities (inspection report required) -> Store counts and confirms, which is the only
  thing that moves `ready_qty` -> Accounts is notified. One pending notice per work order.
- **Dispatch** (`routes/ejw_dispatches.js`): preview / draft / edit / delete draft / issue / cancel. Blocked without the work order's
  customer PO number, or while the customer DC of any dispatched item is unattached. One dispatch = delivery challan (component lines,
  HSN, qty, value, customer DC ref, no GST) + tax invoice (job charge only, SAC 998875 default, CGST+SGST or IGST from the GSTINs).
  Numbers come on issue per `number_source`; e-way bill required when the dispatch total is above 50,000 or interstate. Issue adds
  `returned_qty`; cancel (reason) takes it back and keeps both numbers for good. Partial dispatch supported.
- **Knock-off / close:** `utils/ejwStatus.js` closes the inward and the work order (and sets the project to completed) when every item
  is returned or short-closed. Short-close is Accounts only, with qty and reason (`POST /api/ejw/inward-items/:id/short-close`).
- **Reports** (`/api/ejw/reports/...`): material-inside, stock-as-of?date=, open-customer-dcs, work-orders, invoices (GST split;
  Accounts and Management only). Role shapes as before.
- Tests: `npm run test:ejw3` (55), AKE example 3,32,160 with CGST 10,080 + SGST 10,080.

## 11. Phase 4 delivered (screens + printed documents; migration 014)

- **Migration 014:** `companies.address`, `ejw_dispatches.place_of_supply_state/code` (set on issue from the customer GSTIN) and
  `ejw_dispatches.process_text` ("Job work - return after ..."). Backup taken first; run twice, schema dump identical.
- **PDFs (server-side, pdfkit):** one template per document in `backend/pdf/` (`deliveryChallan.js`, `taxInvoice.js`, `internalDc.js`; shared
  helpers in `common.js`). Routes: `GET /api/ejw/dispatches/:id/delivery-challan.pdf` (Accounts, Management, Store),
  `.../tax-invoice.pdf` (Accounts, Management), `GET /api/jobwork-dcs/:id/pdf` (internal DC; Store, Accounts). A draft cannot be printed; a
  cancelled dispatch is stamped CANCELLED. Fonts are the built-in PDF fonts, so amounts read "Rs.".
- **Other backend:** `GET /api/ejw/ready-for-dispatch` (work orders with Store-confirmed material and their blockers),
  `GET/PUT /api/ejw/company-profile` (address, GSTIN; Management writes), HttpError can carry extra JSON fields (the duplicate-DC 409 returns
  `code: DC_ALREADY_RECEIVED` and `inward_id`), the stock item request list includes customer and customer DC.
- **Screens** (`src/screens/Ejw*.js`, shared parts in `src/components/ejw/`, helpers in `src/utils/ejw.js`): inward form (S1/S2/S3, items with stock
  item picker or "Request stock item", photos, duplicate-DC handling), inward list/detail (add receipt, attach customer DC, acknowledgment
  share/email), work orders (stock awaiting work, create WO, detail with documents, PO no., expected-material note, mark ready, short-close),
  Confirm Ready (Store), Dispatch (ready list, form with live tax preview and blockers, detail with issue / cancel / PDFs), reports, customer master,
  document settings (numbering source, company details). The enquiry's work-type box has a customer dropdown for External Job Work.
- **Not covered by automated tests:** the React Native screens (bundle-checked and statically checked only) and how the PDFs look on paper. See
  `click-through.md` for the manual script.
