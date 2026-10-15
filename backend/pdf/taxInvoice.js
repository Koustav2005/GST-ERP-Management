// Tax Invoice for the job charge only: invoice no./date, our GSTIN, customer + billing address + GSTIN, place of supply
// (state + GST code), SAC, description, taxable value, CGST/SGST or IGST (rate and amount), total, amount in words,
// reference to our DC no. and the customer's PO no., signatures.
const P = require('./common');

async function build(d) {
  const doc = P.newDoc({ Title: `Tax Invoice ${d.invoice_no}` });
  P.companyHeader(doc, d.company, 'TAX INVOICE');
  const pos = d.place_of_supply_state ? `${d.place_of_supply_state}${d.place_of_supply_code ? ` (${d.place_of_supply_code})` : ''}` : null;
  P.pairs(doc,
    [['Invoice No.', d.invoice_no], ['Invoice Date', P.dmy(d.invoice_date)], ['Place of Supply', pos]],
    [['Our DC No.', `${d.dc_no || ''}${d.dc_date ? ` dated ${P.dmy(d.dc_date)}` : ''}`], ['Customer PO No.', d.customer_po_no], ['Work order', d.wo_no]]);
  P.rule(doc);
  P.block(doc, 'BILL TO', [d.customer.name, d.customer.billing_address, d.customer.gstin ? `GSTIN: ${d.customer.gstin}` : null,
    d.customer.state ? `State: ${d.customer.state}` : null]);
  P.rule(doc);
  const intra = Number(d.igst_amount) === 0;
  const rate = Number(d.gst_rate);
  P.table(doc,
    [{ title: 'Description of service', width: 34 }, { title: 'SAC', width: 10 }, { title: 'Taxable value (Rs.)', width: 16, align: 'right' }],
    [[d.job_description || `Job work charges (${d.process_text || 'processing of customer material'})`, d.sac_code, P.inr(d.taxable_value)]]);
  const taxRows = intra
    ? [[`CGST @ ${rate / 2}%`, P.inr(d.cgst_amount)], [`SGST @ ${rate / 2}%`, P.inr(d.sgst_amount)]]
    : [[`IGST @ ${rate}%`, P.inr(d.igst_amount)]];
  P.table(doc, [{ title: 'Tax', width: 44 }, { title: 'Amount (Rs.)', width: 16, align: 'right' }], taxRows,
    { foot: { label: 'Invoice total (Rs.)', value: P.inr(d.invoice_total) } });
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor('black').text(`Amount in words: ${P.amountInWords(d.invoice_total)}`, P.MARGIN, doc.y, { width: doc.pageWidth });
  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(8.5).fillColor('#555555')
    .text('GST is charged on the job work charges only; the value of the customer’s material is not part of this invoice.', P.MARGIN, doc.y, { width: doc.pageWidth });
  P.signatureBlock(doc, 'Customer signature', `For ${d.company.name || ''} — Authorised Signatory`);
  if (d.status === 'cancelled') P.watermark(doc, 'CANCELLED');
  return P.render(doc);
}

module.exports = { build };
