import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import {
  CreateOrderResponse,
  VerifyPaymentResponse,
  TransactionListResponse,
  TransactionDetailResponse,
} from './payment.dto';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Razorpay = require('razorpay');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit');

@Injectable()
export class PaymentService {
  private razorpay: InstanceType<typeof Razorpay>;

  constructor(private prisma: PrismaService) {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }

  /**
   * Create a Razorpay order for wallet recharge
   */
  async createOrder(
    userId: string,
    amountInRupees: number,
  ): Promise<CreateOrderResponse> {
    // Validate amount
    if (amountInRupees < 1 || amountInRupees > 1000) {
      throw new BadRequestException(
        'Amount must be between ₹1 and ₹1000',
      );
    }

    const amountInPaise = Math.round(amountInRupees * 100);

    // Create Razorpay order
    const receipt = `rcpt_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
    
    const razorpayOrder = await this.razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: receipt,
    });

    // Create PaymentTransaction record
    const paymentTransaction = await this.prisma.paymentTransaction.create({
      data: {
        userId,
        gateway: 'razorpay',
        gatewayOrderId: razorpayOrder.id,
        amountCents: amountInPaise,
        currency: 'INR',
        status: 'pending',
      },
    });

    return {
      orderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID || '',
      transactionId: paymentTransaction.id,
    };
  }

  /**
   * Verify Razorpay payment signature and credit wallet
   */
  async verifyPayment(
    userId: string,
    razorpay_order_id: string,
    razorpay_payment_id: string,
    razorpay_signature: string,
  ): Promise<VerifyPaymentResponse> {
    // Generate expected signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(body)
      .digest('hex');

    // Verify signature
    if (expectedSignature !== razorpay_signature) {
      throw new UnauthorizedException('Invalid payment signature');
    }

    // Find the pending payment transaction
    const paymentTransaction = await this.prisma.paymentTransaction.findFirst({
      where: {
        userId,
        gatewayOrderId: razorpay_order_id,
        status: 'pending',
      },
    });

    if (!paymentTransaction) {
      throw new NotFoundException('Payment transaction not found');
    }

    const amountCents = paymentTransaction.amountCents;
    const now = new Date();

    // Use Prisma transaction for atomicity
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Update PaymentTransaction to completed
      await tx.paymentTransaction.update({
        where: { id: paymentTransaction.id },
        data: {
          status: 'completed',
          gatewayTxnId: razorpay_payment_id,
          gatewayResponse: {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            verified_at: now.toISOString(),
          },
        },
      });

      // 2. Find or create wallet
      let wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        wallet = await tx.wallet.create({
          data: {
            userId,
            balanceCents: BigInt(0),
            lifetimeCreditsCents: BigInt(0),
            lifetimeSpentCents: BigInt(0),
          },
        });
      }

      // 3. Calculate new balance
      const newBalanceCents = BigInt(wallet.balanceCents) + BigInt(amountCents);
      const newLifetimeCreditsCents =
        BigInt(wallet.lifetimeCreditsCents) + BigInt(amountCents);

      // 4. Update wallet balance
      wallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balanceCents: newBalanceCents,
          lifetimeCreditsCents: newLifetimeCreditsCents,
        },
      });

      // 5. Create WalletTransaction
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          txnType: 'credit',
          amountCents: BigInt(amountCents),
          balanceAfterCents: newBalanceCents,
          referenceType: 'payment',
          referenceId: paymentTransaction.id,
          description: 'Credit recharge via Razorpay',
        },
      });

      // 6. Generate invoice number (INV-YYYYMMDD-XXXXX)
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      const invoiceNumber = `INV-${dateStr}-${randomSuffix}`;

      // 7. Create Invoice
      const invoice = await tx.invoice.create({
        data: {
          userId,
          invoiceNumber,
          periodStart: now,
          periodEnd: now,
          subtotalCents: BigInt(amountCents),
          taxCents: BigInt(0), // No GST for credits top-up in test mode
          totalCents: BigInt(amountCents),
          currency: 'INR',
          status: 'paid',
          issuedAt: now,
          paidAt: now,
        },
      });

      // 8. Create InvoiceLineItem
      await tx.invoiceLineItem.create({
        data: {
          invoiceId: invoice.id,
          description: 'Credit Recharge',
          quantity: 1,
          unitPriceCents: amountCents,
          totalCents: BigInt(amountCents),
          referenceType: 'payment_transaction',
          referenceId: paymentTransaction.id,
        },
      });

      return {
        wallet,
        invoice,
      };
    });

    return {
      success: true,
      newBalance: Number(result.wallet.balanceCents) / 100,
    };
  }

  /**
   * Get paginated list of user's payment transactions
   */
  async getTransactions(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<TransactionListResponse> {
    const skip = (page - 1) * limit;

    // Get transactions with related invoice
    const [transactions, total] = await Promise.all([
      this.prisma.paymentTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          subscriptions: false,
        },
      }),
      this.prisma.paymentTransaction.count({
        where: { userId },
      }),
    ]);

    // Fetch related invoices (via InvoiceLineItem reference)
    const transactionIds = transactions.map((t) => t.id);
    const invoiceLineItems = await this.prisma.invoiceLineItem.findMany({
      where: {
        referenceType: 'payment_transaction',
        referenceId: { in: transactionIds },
      },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
          },
        },
      },
    });

    // Map invoices by transaction ID
    const invoiceByTxnId = new Map<string, { id: string; invoiceNumber: string; status: string }>();
    for (const item of invoiceLineItems) {
      if (item.referenceId) {
        invoiceByTxnId.set(item.referenceId, item.invoice);
      }
    }

    return {
      transactions: transactions.map((t) => ({
        id: t.id,
        amountCents: t.amountCents,
        currency: t.currency,
        status: t.status,
        gateway: t.gateway,
        gatewayOrderId: t.gatewayOrderId,
        gatewayTxnId: t.gatewayTxnId,
        createdAt: t.createdAt,
        invoice: invoiceByTxnId.get(t.id) || null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get detailed transaction information
   */
  async getTransactionDetail(
    userId: string,
    transactionId: string,
  ): Promise<TransactionDetailResponse> {
    const transaction = await this.prisma.paymentTransaction.findFirst({
      where: {
        id: transactionId,
        userId, // Security check
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Find related invoice via InvoiceLineItem
    const invoiceLineItem = await this.prisma.invoiceLineItem.findFirst({
      where: {
        referenceType: 'payment_transaction',
        referenceId: transactionId,
      },
      include: {
        invoice: {
          include: {
            invoiceLineItems: true,
          },
        },
      },
    });

    return {
      id: transaction.id,
      userId: transaction.userId,
      gateway: transaction.gateway,
      gatewayTxnId: transaction.gatewayTxnId,
      gatewayOrderId: transaction.gatewayOrderId,
      amountCents: transaction.amountCents,
      currency: transaction.currency,
      status: transaction.status,
      gatewayResponse: transaction.gatewayResponse as object | null,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      invoice: invoiceLineItem
        ? {
            id: invoiceLineItem.invoice.id,
            invoiceNumber: invoiceLineItem.invoice.invoiceNumber,
            periodStart: invoiceLineItem.invoice.periodStart,
            periodEnd: invoiceLineItem.invoice.periodEnd,
            subtotalCents: Number(invoiceLineItem.invoice.subtotalCents),
            taxCents: Number(invoiceLineItem.invoice.taxCents),
            totalCents: Number(invoiceLineItem.invoice.totalCents),
            currency: invoiceLineItem.invoice.currency,
            status: invoiceLineItem.invoice.status,
            issuedAt: invoiceLineItem.invoice.issuedAt,
            paidAt: invoiceLineItem.invoice.paidAt,
            lineItems: invoiceLineItem.invoice.invoiceLineItems.map((item) => ({
              id: item.id,
              description: item.description,
              quantity: item.quantity,
              unitPriceCents: item.unitPriceCents,
              totalCents: Number(item.totalCents),
            })),
          }
        : null,
    };
  }

  /**
   * Generate and return invoice PDF as buffer
   */
  async generateInvoicePdf(
    userId: string,
    transactionId: string,
  ): Promise<Buffer> {
    // Get transaction details
    const transactionDetail = await this.getTransactionDetail(
      userId,
      transactionId,
    );

    if (!transactionDetail.invoice) {
      throw new NotFoundException('Invoice not found for this transaction');
    }

    // Get user info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    const invoice = transactionDetail.invoice;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc
          .fontSize(24)
          .font('Helvetica-Bold')
          .text('LaaS - Lab as a Service', { align: 'center' });
        doc.moveDown(0.5);
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#666666')
          .text('AI/ML Computing Platform', { align: 'center' });
        doc.moveDown(2);

        // Invoice title
        doc
          .fontSize(18)
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text('INVOICE', { align: 'center' });
        doc.moveDown(1);

        // Invoice details box
        const invoiceInfoY = doc.y;
        doc.fontSize(10).font('Helvetica');

        // Left side - Invoice info
        doc.text(`Invoice Number: ${invoice.invoiceNumber}`, 50, invoiceInfoY);
        doc.text(
          `Date: ${new Date(invoice.issuedAt || invoice.periodStart).toLocaleDateString('en-IN')}`,
          50,
          invoiceInfoY + 15,
        );
        doc.text(`Status: ${invoice.status.toUpperCase()}`, 50, invoiceInfoY + 30);

        // Right side - Customer info
        const customerName =
          user?.firstName && user?.lastName
            ? `${user.firstName} ${user.lastName}`
            : user?.email || 'Customer';
        doc.text('Bill To:', 350, invoiceInfoY);
        doc.text(customerName, 350, invoiceInfoY + 15);
        doc.text(user?.email || '', 350, invoiceInfoY + 30);

        doc.moveDown(4);

        // Table header
        const tableTop = doc.y + 10;
        const col1 = 50;
        const col2 = 280;
        const col3 = 350;
        const col4 = 450;

        // Draw table header background
        doc.rect(col1 - 5, tableTop - 5, 510, 20).fill('#f0f0f0');

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text('Description', col1, tableTop)
          .text('Qty', col2, tableTop)
          .text('Unit Price', col3, tableTop)
          .text('Total', col4, tableTop);

        // Table rows
        let rowY = tableTop + 25;
        doc.font('Helvetica');

        for (const item of invoice.lineItems) {
          doc.text(item.description, col1, rowY);
          doc.text(item.quantity.toString(), col2, rowY);
          doc.text(`₹${(item.unitPriceCents / 100).toFixed(2)}`, col3, rowY);
          doc.text(`₹${(Number(item.totalCents) / 100).toFixed(2)}`, col4, rowY);
          rowY += 20;
        }

        // Summary
        rowY += 20;
        doc.moveTo(350, rowY).lineTo(560, rowY).stroke();
        rowY += 10;

        doc.text('Subtotal:', 350, rowY);
        doc.text(
          `₹${(Number(invoice.subtotalCents) / 100).toFixed(2)}`,
          col4,
          rowY,
        );
        rowY += 15;

        doc.text('Tax (GST):', 350, rowY);
        doc.text(`₹${(Number(invoice.taxCents) / 100).toFixed(2)}`, col4, rowY);
        rowY += 15;

        doc.moveTo(350, rowY).lineTo(560, rowY).stroke();
        rowY += 10;

        doc.font('Helvetica-Bold');
        doc.text('Total:', 350, rowY);
        doc.text(`₹${(Number(invoice.totalCents) / 100).toFixed(2)}`, col4, rowY);

        // Payment status
        rowY += 30;
        if (invoice.paidAt) {
          doc
            .font('Helvetica')
            .fontSize(10)
            .fillColor('#28a745')
            .text(
              `Payment received on ${new Date(invoice.paidAt).toLocaleDateString('en-IN')}`,
              50,
              rowY,
            );
        }

        // Footer
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#999999')
          .text(
            'Thank you for using LaaS!',
            50,
            doc.page.height - 80,
            { align: 'center', width: 500 },
          );
        doc.text(
          'For support, contact: support@laas.edu',
          50,
          doc.page.height - 65,
          { align: 'center', width: 500 },
        );
        doc.text(
          `Generated on ${new Date().toLocaleString('en-IN')}`,
          50,
          doc.page.height - 50,
          { align: 'center', width: 500 },
        );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
