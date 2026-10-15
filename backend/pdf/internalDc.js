// Delivery Challan for INTERNAL job work (our material sent to a vendor), same style as the external one.
const P = require('./common');

async function build(d) {
  const doc = P.newDoc({ Title: `Delivery Challan ${d.dc_number}` });
  P.companyHeader(doc, d.company, 'DELIVERY CHALLAN');
  doc.font('Helvetica-Bold').fontSize(10).fillColor('black').text(`Job work — return after ${d.process || 'processing'}`, P.MARGIN, doc.y, { width: doc.pageWidth, align: 'center' });
  doc.moveDown(0.5);
  P.pairs(doc, [['DC No.', d.dc_number], ['DC Date', P.dmy(d.dc_date)]], [['Vehicle No.', d.vehicle_number], ['E-way Bill No.', d.eway_bill_no]]);
  P.rule(doc);
  P.block(doc, 'SEND TO (JOB WORKER)', [d.vendor_name, d.vendor_address, d.vendor_gstin ? `GSTIN: ${d.vendor_gstin}` : null]);
  P.rule(doc);
  const total = d.items.reduce((s, i) => s + Math.round(Number(i.total_value) * 100), 0) / 100;
  P.table(doc,
    [{ title: 'Sl', width: 4 }, { title: 'Description', width: 34 }, { title: 'HSN', width: 10 }, { title: 'Qty', width: 8, align: 'right' },
      { title: 'Unit', width: 6 }, { title: 'Value (Rs.)', width: 14, align: 'right' }],
    d.items.map((i, n) => [n + 1, i.description, i.hsn_code || '', P.num(i.quantity), i.unit || '', P.inr(i.total_value)]),
    { foot: { label: 'Total value (Rs.)', value: P.inr(total) } });
  doc.font('Helvetica').fontSize(8.5).fillColor('#555555')
    .text('Goods sent for job work only and to be returned after processing.', P.MARGIN, doc.y, { width: doc.pageWidth });
  P.signatureBlock(doc, 'Received by (signature, date)', `For ${d.company.name || ''} — Authorised Signatory`);
  return P.render(doc);
}

module.exports = { build };
