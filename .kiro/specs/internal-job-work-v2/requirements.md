# Internal Job Work v2 — Requirements

Company: Suhitha Engineering. Source: 27 July 2026 meeting with the company.

## What "internal job work" means
Our own component (already part of a regular project) goes OUT to a vendor for a
process we can't do in-house (shot blasting, rolling, machining…) and must COME BACK.
Flow: Suhitha → Vendor B → (optionally Vendor C) → Suhitha.

The component keeps its value the whole time. GST is charged by the vendor ONLY on
their job charge, never on the component value.

## What exists today (do not break)
- `POST /job-work/submit` — PM creates request (JW-YYYY-NNNN), project, job work type,
  loaded/unloaded vehicle weights, Store Incharge, items, optional vehicle no., ≤10 images.
  Logs "Fabrication → Job Work" in project status history.
- `PUT /job-work/:id/challan` — Store Incharge uploads a challan FILE, picks an Accountant,
  optional vendor email. Status → `challan_uploaded`. Emails vendor; email errors are swallowed.
- `/job-work/accountant/:id` — Accountant can only view `challan_uploaded` requests.
- Nothing handles the material coming back.

## Target flow
1. PM submits request (unchanged).
2. If the component has no stock item, Store asks Accountant to create it (stock item master).
3. Store Incharge creates a structured DELIVERY CHALLAN (DC) in the app.
4. Accountant approves or rejects the DC and enters the e-way bill number.
5. Store marks it dispatched → material is "outside factory, at Vendor B".
6. (Optional) Vendor B forwards to Vendor C for a 2nd process (bill to us, ship to C):
   Store records a location move on the same DC.
7. Material returns: Store records a RETURN against our DC — vendor DC no./date,
   vendor invoice no./date, job charge, SAC, GST rate, quantity received per item.
   Partial returns allowed.
8. When every item's returned qty = sent qty, the DC is CLOSED (knocked off).

## Statuses (job work request / DC)
`requested` → `dc_created` → `approved` (or `rejected` → back to Store to edit)
→ `dispatched` → `partially_returned` → `closed`

Invalid transitions must return 400. Each transition writes to project status history.

## Data (adapt names to existing conventions; reuse existing vendor and inventory tables if they fit)
- **gst_rates** — master: rate (5, 18, 40), label, is_active. Admin-editable. Used as a dropdown everywhere.
- **jobwork_dcs** — company_id, job_work_request_id, dc_number (unique per company,
  auto e.g. SE/DC/0001, editable), dc_date, vendor (id + GSTIN + address snapshot),
  process, vehicle_number, loaded/unloaded weight, eway_bill_no, current_location_vendor_id,
  status, created_by, approved_by, approved_at, rejection_reason, dispatched_at, closed_at,
  optional attachment (keep old uploaded challan file working).
- **jobwork_dc_items** — dc_id, stock_item_id, description, hsn_code, quantity, unit,
  unit_value, total_value, returned_quantity (default 0).
- **jobwork_dc_movements** — dc_id, from_vendor_id, to_vendor_id, vendor_dc_no, moved_at, note.
- **jobwork_returns** — dc_id, vendor_id, vendor_dc_no, vendor_dc_date, invoice_no,
  invoice_date, job_charge, sac_code, gst_rate_id, gst_amount, total, received_by, received_at.
- **jobwork_return_items** — return_id, dc_item_id, quantity_received.

## Rules
- Only Store Incharge creates/edits DCs and records returns/movements.
- Only Accountant approves/rejects and enters the e-way bill number.
- A DC can't be dispatched before approval.
- Return qty per item can't exceed (sent − already returned). Use a DB transaction.
- GST amount = job_charge × rate. Never applied to component value.
- Email failures must be returned to the UI as a warning, not silently ignored.
- All queries scoped by company_id.

## Screens
- **Store Incharge**: "Job Work — Outward" list with ALL PMs' requests grouped by vendor
  (so two jobs to the same vendor can share a truck); Create/Edit DC form; Dispatch;
  Record Movement; Record Return.
- **Accountant**: Pending approval list; DC detail with Approve/Reject + e-way no.;
  vendor invoices from returns.
- **PM**: job work status inside project details (where the material is, since when, pending qty).
- **Report**: "Material outside factory" — open DCs, vendor, current location, days out,
  pending qty and value. Filter by vendor/project/date.

## Out of scope for now
E-way bill / e-invoice API integration (numbers are entered manually), truck-load
optimisation, external job work, labour job.