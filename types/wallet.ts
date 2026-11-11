export type TransactionType = "topup" | "debit" | "refund" | "cashback";

export type TransactionStatus = "success" | "pending" | "failed";

export interface WalletBalance {
  available: number;
  currency: string;
  lastUpdated: string;
  pendingCredits: number;
  cashbackEarned: number;
  cashbackTier: string;
  cashbackPercentage: number;
}

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  description: string;
  orderRef?: string;
  previousBalance: number;
  amount: number;
  closingBalance: number;
  status: TransactionStatus;
  paymentMethod?: string;
  invoiceUrl?: string;
}

export interface TopUpPayload {
  amount: number;
  currency: string;
  paymentMethod: "stripe" | "bank_transfer" | "saved_card";
  savedCardId?: string;
}
