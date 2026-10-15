// Shared building blocks for the printed documents. Each document has ONE template file (deliveryChallan.js,
// taxInvoice.js, internalDc.js): to change a layout, edit that file only. Fonts are the built-in PDF fonts, so the
// rupee sign is written "Rs." (the standard fonts have no rupee glyph).

const PDFDocument = require('pdfkit');

const MARGIN = 36;
const GREY = '#555555';
const LINE = '#999999';

// compress:false keeps the text readable inside the file, which the tests rely on (and the files are tiny).
function newDoc(info) {
  const doc = new PDFDocument({ size: 'A4', margin: MARGIN, compress: false, info });
  doc.pageWidth = doc.page.width - MARGIN * 2;
  return doc;
}

function render(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

const dmy = (v) => {
  if (!v) return '';
  const s = String(v).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s.slice(8, 10)}-${s.slice(5, 7)}-${s.slice(0, 4)}` : String(v);
};
const num = (v) => String(Number(v));
const inr = (v) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ---- amount in words (Indian system: thousand, lakh, crore) ----
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen',
  'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function below1000(n) {
  const out = [];
  if (n >= 100) { out.push(`${ONES[Math.floor(n / 100)]} Hundred`); n %= 100; }
  if (n >= 20) { out.push(TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : '')); } else if (n > 0) { out.push(ONES[n]); }
  return out.join(' ');
}

function wholeInWords(n) {
  if (n === 0) return 'Zero';
  const parts = [];
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) parts.push(`${wholeInWords(crore)} Crore`);
  if (lakh) parts.push(`${below1000(lakh)} Lakh`);
  if (thousand) parts.push(`${below1000(thousand)} Thousand`);
  if (n) parts.push(below1000(n));
  return parts.join(' ');
}

// 132160.5 -> "Rupees One Lakh Thirty Two Thousand One Hundred Sixty and Fifty Paise Only"
function amountInWords(amount) {
  const totalPaise = Math.round(Number(amount) * 100);
  const rupees = Math.floor(totalPaise / 100);
  const paise = totalPaise % 100;
  return `Rupees ${wholeInWords(rupees)}${paise ? ` and ${wholeInWords(paise)} Paise` : ''} Only`;
}

// ---- layout helpers ----
function companyHeader(doc, company, title) {
  doc.font('Helvetica-Bold').fontSize(15).fillColor('black').text(company.name || '', MARGIN, MARGIN, { width: doc.pageWidth, align: 'center' });
  doc.font('Helvetica').fontSize(9).fillColor(GREY);
  if (company.address) doc.text(company.address, { width: doc.pageWidth, align: 'center' });
  if (company.gst_number) doc.text(`GSTIN: ${company.gst_number}${company.state ? `   State: ${company.state}` : ''}`, { width: doc.pageWidth, align: 'center' });
  doc.moveDown(0.4);
  doc.font('Helvetica-Bold').fontSize(13).fillColor('black').text(title, { width: doc.pageWidth, align: 'center' });
  doc.moveDown(0.3);
  rule(doc);
}

function rule(doc) {
  const y = doc.y + 2;
  doc.moveTo(MARGIN, y).lineTo(MARGIN + doc.pageWidth, y).strokeColor(LINE).lineWidth(0.7).stroke();
  doc.y = y + 6;
  doc.x = MARGIN;
}

// "Label: value" pairs in two columns.
function pairs(doc, left, right) {
  const colW = doc.pageWidth / 2 - 6;
  const top = doc.y;
  const draw = (list, x) => {
    let y = top;
    for (const [label, value] of list) {
      if (value === undefined || value === null || value === '') continue;
      doc.font('Helvetica-Bold').fontSize(9).fillColor('black').text(`${label}: `, x, y, { width: colW, continued: true });
      doc.font('Helvetica').text(String(value));
      y = doc.y + 1;
    }
    return y;
  };
  const yl = draw(left, MARGIN);
  const yr = draw(right, MARGIN + colW + 12);
  doc.x = MARGIN;
  doc.y = Math.max(yl, yr) + 4;
}

function block(doc, heading, lines) {
  doc.font('Helvetica-Bold').fontSize(9).fillColor(GREY).text(heading, MARGIN, doc.y, { width: doc.pageWidth });
  doc.font('Helvetica').fontSize(10).fillColor('black');
  for (const l of lines) if (l) doc.text(l, { width: doc.pageWidth });
  doc.moveDown(0.3);
}

// columns: [{ title, width (weight), align }]; rows: arrays of values. Repeats the header on a new page.
function table(doc, columns, rows, { foot } = {}) {
  const total = columns.reduce((s, c) => s + c.width, 0);
  const widths = columns.map((c) => (c.width / total) * doc.pageWidth);
  const drawHeader = () => {
    const y = doc.y;
    doc.rect(MARGIN, y, doc.pageWidth, 18).fillAndStroke('#EEEEEE', LINE);
    let x = MARGIN;
    doc.fillColor('black').font('Helvetica-Bold').fontSize(8.5);
    columns.forEach((c, i) => { doc.text(c.title, x + 3, y + 5, { width: widths[i] - 6, align: c.align || 'left', lineBreak: false }); x += widths[i]; });
    doc.y = y + 18;
  };
  drawHeader();
  doc.font('Helvetica').fontSize(9);
  for (const row of rows) {
    const heights = row.map((cell, i) => doc.heightOfString(String(cell), { width: widths[i] - 6 }));
    const h = Math.max(...heights) + 8;
    if (doc.y + h > doc.page.height - MARGIN - 130) { doc.addPage(); drawHeader(); doc.font('Helvetica').fontSize(9); }
    const y = doc.y;
    let x = MARGIN;
    doc.rect(MARGIN, y, doc.pageWidth, h).strokeColor(LINE).lineWidth(0.5).stroke();
    row.forEach((cell, i) => { doc.fillColor('black').text(String(cell), x + 3, y + 4, { width: widths[i] - 6, align: columns[i].align || 'left' }); x += widths[i]; });
    doc.y = y + h;
  }
  if (foot) {
    const y = doc.y;
    doc.rect(MARGIN, y, doc.pageWidth, 18).strokeColor(LINE).stroke();
    doc.font('Helvetica-Bold').fontSize(9).fillColor('black').text(foot.label, MARGIN + 3, y + 5, { width: doc.pageWidth - 130, align: 'right', lineBreak: false });
    doc.text(foot.value, MARGIN + doc.pageWidth - 120, y + 5, { width: 114, align: 'right', lineBreak: false });
    doc.y = y + 18;
  }
  doc.x = MARGIN;
  doc.moveDown(0.5);
}

function signatureBlock(doc, left, right) {
  if (doc.y > doc.page.height - MARGIN - 90) doc.addPage();
  const y = doc.page.height - MARGIN - 70;
  doc.y = Math.max(doc.y + 20, y);
  const top = doc.y;
  doc.moveTo(MARGIN, top + 40).lineTo(MARGIN + 170, top + 40).strokeColor(LINE).stroke();
  doc.moveTo(MARGIN + doc.pageWidth - 170, top + 40).lineTo(MARGIN + doc.pageWidth, top + 40).stroke();
  doc.font('Helvetica').fontSize(9).fillColor('black');
  doc.text(left, MARGIN, top + 44, { width: 170, lineBreak: false });
  doc.text(right, MARGIN + doc.pageWidth - 170, top + 44, { width: 170, align: 'right', lineBreak: false });
}

function watermark(doc, word) {
  doc.save();
  doc.rotate(-35, { origin: [doc.page.width / 2, doc.page.height / 2] });
  doc.font('Helvetica-Bold').fontSize(90).fillColor('#DDDDDD').opacity(0.5)
    .text(word, MARGIN, doc.page.height / 2 - 45, { width: doc.pageWidth, align: 'center', lineBreak: false });
  doc.restore();
  doc.opacity(1).fillColor('black');
}

module.exports = { newDoc, render, dmy, num, inr, amountInWords, companyHeader, rule, pairs, block, table, signatureBlock, watermark, MARGIN };
