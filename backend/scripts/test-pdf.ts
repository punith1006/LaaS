import { PrismaClient } from '@prisma/client';
const PDFDocument = require('pdfkit');

const prisma = new PrismaClient();

async function main() {
  const txn = await prisma.paymentTransaction.findFirst({
    where: { status: 'completed' },
  });

  if (!txn) {
    console.log('No completed transaction');
    return;
  }

  console.log('Testing PDF generation for txn:', txn.id);

  // Find invoice
  const invoiceLineItem = await prisma.invoiceLineItem.findFirst({
    where: {
      referenceType: 'payment_transaction',
      referenceId: txn.id,
    },
    include: {
      invoice: {
        include: { invoiceLineItems: true },
      },
    },
  });

  if (!invoiceLineItem) {
    console.log('No invoice found');
    return;
  }

  const invoice = invoiceLineItem.invoice;
  console.log('Invoice:', invoice.invoiceNumber);

  try {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => {
      const pdf = Buffer.concat(chunks);
      console.log('PDF generated successfully! Size:', pdf.length, 'bytes');
    });
    doc.on('error', (err: Error) => {
      console.log('PDF ERROR:', err.message);
    });

    doc.fontSize(24).font('Helvetica-Bold').text('LaaS - Lab as a Service', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#666666').text('AI/ML Computing Platform', { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#000000').text('INVOICE', { align: 'center' });
    doc.moveDown(1);

    doc.fontSize(10).font('Helvetica');
    doc.text(`Invoice Number: ${invoice.invoiceNumber}`);
    doc.text(`Status: ${invoice.status.toUpperCase()}`);
    doc.moveDown(2);

    // Table
    for (const item of invoice.invoiceLineItems) {
      doc.text(`${item.description} - Qty: ${item.quantity} - ₹${(Number(item.totalCents) / 100).toFixed(2)}`);
    }

    doc.moveDown(1);
    doc.font('Helvetica-Bold');
    doc.text(`Total: ₹${(Number(invoice.totalCents) / 100).toFixed(2)}`);

    doc.end();
  } catch (err: any) {
    console.log('CAUGHT ERROR:', err.message);
    console.log('Stack:', err.stack);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.log('MAIN ERROR:', e.message, e.stack); });
