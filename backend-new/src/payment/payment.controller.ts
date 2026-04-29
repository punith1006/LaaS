import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentService } from './payment.service';
import {
  CreateOrderDto,
  VerifyPaymentDto,
  GetTransactionsDto,
  CreateOrderResponse,
  VerifyPaymentResponse,
  TransactionListResponse,
  TransactionDetailResponse,
} from './payment.dto';

@Controller('api/payment')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  /**
   * Create a Razorpay order for wallet recharge
   * POST /api/payment/create-order
   */
  @UseGuards(JwtAuthGuard)
  @Post('create-order')
  @HttpCode(HttpStatus.OK)
  async createOrder(
    @Req() req: { user: { id: string } },
    @Body() dto: CreateOrderDto,
  ): Promise<CreateOrderResponse> {
    return this.paymentService.createOrder(req.user.id, dto.amountInRupees);
  }

  /**
   * Verify Razorpay payment signature and credit wallet
   * POST /api/payment/verify
   */
  @UseGuards(JwtAuthGuard)
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyPayment(
    @Req() req: { user: { id: string } },
    @Body() dto: VerifyPaymentDto,
  ): Promise<VerifyPaymentResponse> {
    return this.paymentService.verifyPayment(
      req.user.id,
      dto.razorpay_order_id,
      dto.razorpay_payment_id,
      dto.razorpay_signature,
    );
  }

  /**
   * Get paginated list of payment transactions
   * GET /api/payment/transactions?page=1&limit=10
   */
  @UseGuards(JwtAuthGuard)
  @Get('transactions')
  async getTransactions(
    @Req() req: { user: { id: string } },
    @Query() query: GetTransactionsDto,
  ): Promise<TransactionListResponse> {
    return this.paymentService.getTransactions(
      req.user.id,
      query.page ?? 1,
      query.limit ?? 10,
    );
  }

  /**
   * Get detailed transaction information
   * GET /api/payment/transactions/:id
   */
  @UseGuards(JwtAuthGuard)
  @Get('transactions/:id')
  async getTransactionDetail(
    @Req() req: { user: { id: string } },
    @Param('id') transactionId: string,
  ): Promise<TransactionDetailResponse> {
    return this.paymentService.getTransactionDetail(req.user.id, transactionId);
  }

  /**
   * Download invoice PDF for a transaction
   * GET /api/payment/invoice/:transactionId/download
   */
  @UseGuards(JwtAuthGuard)
  @Get('invoice/:transactionId/download')
  async downloadInvoice(
    @Req() req: { user: { id: string } },
    @Param('transactionId') transactionId: string,
    @Res() res: FastifyReply,
  ): Promise<void> {
    try {
      const pdfBuffer = await this.paymentService.generateInvoicePdf(
        req.user.id,
        transactionId,
      );

      // Get invoice number for filename
      const txnDetail = await this.paymentService.getTransactionDetail(
        req.user.id,
        transactionId,
      );
      const filename = txnDetail.invoice
        ? `${txnDetail.invoice.invoiceNumber}.pdf`
        : `invoice-${transactionId}.pdf`;

      res
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .header('Content-Length', pdfBuffer.length)
        .send(pdfBuffer);
    } catch (error) {
      console.error('Invoice download error:', error);
      res.status(500).send({ message: error?.message || 'Failed to generate invoice' });
    }
  }
}
