import { IsNumber, IsString, Min, Max, IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderDto {
  @IsNumber()
  @Min(1, { message: 'Minimum recharge amount is ₹1' })
  @Max(1000, { message: 'Maximum recharge amount is ₹1000' })
  amountInRupees: number;
}

export class VerifyPaymentDto {
  @IsString()
  razorpay_order_id: string;

  @IsString()
  razorpay_payment_id: string;

  @IsString()
  razorpay_signature: string;
}

export class GetTransactionsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;
}

// Response interfaces
export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  transactionId: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  newBalance: number;
}

export interface TransactionListResponse {
  transactions: TransactionSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TransactionSummary {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  gateway: string;
  gatewayOrderId: string | null;
  gatewayTxnId: string | null;
  createdAt: Date;
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
  } | null;
}

export interface TransactionDetailResponse {
  id: string;
  userId: string;
  gateway: string;
  gatewayTxnId: string | null;
  gatewayOrderId: string | null;
  amountCents: number;
  currency: string;
  status: string;
  gatewayResponse: object | null;
  createdAt: Date;
  updatedAt: Date;
  invoice: {
    id: string;
    invoiceNumber: string;
    periodStart: Date;
    periodEnd: Date;
    subtotalCents: number;
    taxCents: number;
    totalCents: number;
    currency: string;
    status: string;
    issuedAt: Date | null;
    paidAt: Date | null;
    lineItems: {
      id: string;
      description: string;
      quantity: number;
      unitPriceCents: number;
      totalCents: number;
    }[];
  } | null;
}
