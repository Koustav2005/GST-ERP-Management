// Delivery Challan for an external job work dispatch: our details, the customer, "Job work - return after <process>",
// our DC ref + the customer's DC no./date, component lines (description, HSN, qty, unit, value), total, vehicle, e-way,
// signatures. No GST on it (GST is on the job charge, on the tax invoice).
const P = require('./common');

// d: { dc_no, dc_date, status, customer, company, items, process_text, vehicle_no, eway_bill_no, component_value,
//      customer_po_no, wo_no, customer_dc_refs }
async function build(d) {
  const doc = P.newDoc({ Title: `Delivery Challan ${d.dc_no}` });
  P.companyHeader(doc, d.company, 'DELIVERY CHALLAN');
  doc.font('Helvetica-Bold').fontSize(10).fillColor('black').text(`Job work — return after ${d.process_text || 'processing'}`, P.MARGIN, doc.y, { width: doc.pageWidth, align: 'center' });
  doc.moveDown(0.5);
  P.pairs(doc,
    [['DC No.', d.dc_no], ['DC Date', P.dmy(d.dc_date)], ['Work order', d.wo_no], ['Customer PO No.', d.customer_po_no]],
    [['Customer DC Ref.', d.customer_dc_refs], ['Vehicle No.', d.vehicle_no], ['E-way Bill No.', d.eway_bill_no]]);
  P.rule(doc);
  P.block(doc, 'DELIVER TO (CONSIGNEE / OWNER OF MATERIAL)', [
    d.customer.name, d.customer.works_address || d.customer.billing_address,
    d.customer.gstin ? `GSTIN: ${d.customer.gstin}` : null, d.customer.state ? `State: ${d.customer.state}` : null]);
  P.rule(doc);
  P.table(doc,
    [{ title: 'Sl', width: 4 }, { title: 'Description', width: 30 }, { title: 'HSN', width: 9 }, { title: 'Qty', width: 8, align: 'right' },
      { title: 'Unit', width: 6 }, { title: 'Customer DC', width: 14 }, { title: 'Value (Rs.)', width: 13, align: 'right' }],
    d.items.map((i, n) => [n + 1, i.description, i.hsn || '', P.num(i.qty), i.unit || '', i.customer_dc_no || '', P.inr(i.value)]),
    { foot: { label: 'Total value of goods (Rs.)', value: P.inr(d.component_value) } });
  doc.font('Helvetica').fontSize(8.5).fillColor('#555555')
    .text('Material returned after job work only. Value shown is for transport / insurance purposes; GST is charged on the job work charges in the Tax Invoice.', P.MARGIN, doc.y, { width: doc.pageWidth });
  P.signatureBlock(doc, 'Received by (signature, date)', `For ${d.company.name || ''} — Authorised Signatory`);
  if (d.status === 'cancelled') P.watermark(doc, 'CANCELLED');
  return P.render(doc);
}

module.exports = { build };
