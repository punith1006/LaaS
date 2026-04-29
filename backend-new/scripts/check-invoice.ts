import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find a completed transaction
  const txn = await prisma.paymentTransaction.findFirst({
    where: { status: 'completed' },
    select: { id: true, userId: true, status: true },
  });

  if (!txn) {
    console.log('No completed transactions found');
    await prisma.$disconnect();
    return;
  }

  console.log('Transaction:', txn.id, 'User:', txn.userId);

  // Check if there's a linked invoice line item
  const lineItem = await prisma.invoiceLineItem.findFirst({
    where: {
      referenceType: 'payment_transaction',
      referenceId: txn.id,
    },
    include: {
      invoice: true,
    },
  });

  if (lineItem) {
    console.log('Invoice found:', lineItem.invoice.invoiceNumber);
    console.log('Invoice status:', lineItem.invoice.status);
    console.log('subtotalCents:', lineItem.invoice.subtotalCents.toString());
    console.log('totalCents:', lineItem.invoice.totalCents.toString());
  } else {
    console.log('NO invoice line item found for this transaction!');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
