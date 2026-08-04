import { z } from 'zod';

export interface PresaleMainDetails {
  tradingEntity: string;
  mainContact: string;
  mobileNumber: string;
  email: string;
  abn: string;
  dateListedForSale: string;
  address: string;
}

export interface PresaleDeedOfVariation {
  status: 'not_started' | 'signed_online' | 'pdf_uploaded';
  signedAt?: string;
  signerName?: string;
  signerEmail?: string;
  signatureDataUrl?: string;
  pdfFileName?: string;
  pdfDataUrl?: string;
}

export interface PresalesDetails {
  commencementDate: string;
  expiryDate: string;
  ultimateExpiryDate: string;
  unlimitedTermOffer: string; // 'Yes' | 'No'
  unlimitedTermFee: number | string;
  renewalTermsYears: number | string;
  termOnFranchiseeIM: string;
  dateBusinessStarted: string;
  totalDailyRunTime: string;
  lowPrice: number | string;
  highPrice: number | string;
  serviceRevenue: number | string;
  serviceRevenueYear: string;
  mpexCommission: number | string;
  mpexCommissionYear: string;
  sendleCommission: number | string;
  sendleCommissionYear: string;
  salesCommissionPercent: number | string;
  nabAccreditation: string; // 'Yes' | 'No'
  nabAccreditationFee: number | string;
  salePrice: number | string;
}

export interface PresaleRecord {
  id: string; // franchiseeId or custom doc id
  franchiseeId: string;
  franchiseeName: string;
  status: 'Draft' | 'Deed Pending' | 'Deed Signed' | 'Active Presale' | 'Sold' | 'Cancelled';
  mainDetails: PresaleMainDetails;
  deedOfVariation: PresaleDeedOfVariation;
  presalesDetails: PresalesDetails;
  createdAt: string;
  updatedAt: string;
  createdByUid?: string;
  createdByName?: string;
  updatedByUid?: string;
  updatedByName?: string;
}

export const PresaleRecordSchema = z.object({
  franchiseeId: z.string(),
  franchiseeName: z.string().optional().default(''),
  status: z.enum(['Draft', 'Deed Pending', 'Deed Signed', 'Active Presale', 'Sold', 'Cancelled']).default('Draft'),
  mainDetails: z.object({
    tradingEntity: z.string().default(''),
    mainContact: z.string().default(''),
    mobileNumber: z.string().default(''),
    email: z.string().default(''),
    abn: z.string().default(''),
    dateListedForSale: z.string().default(''),
    address: z.string().default(''),
  }),
  deedOfVariation: z.object({
    status: z.enum(['not_started', 'signed_online', 'pdf_uploaded']).default('not_started'),
    signedAt: z.string().optional(),
    signerName: z.string().optional(),
    signerEmail: z.string().optional(),
    signatureDataUrl: z.string().optional(),
    pdfFileName: z.string().optional(),
    pdfDataUrl: z.string().optional(),
  }),
  presalesDetails: z.object({
    commencementDate: z.string().default(''),
    expiryDate: z.string().default(''),
    ultimateExpiryDate: z.string().default(''),
    unlimitedTermOffer: z.string().default('No'),
    unlimitedTermFee: z.union([z.number(), z.string()]).default(0),
    renewalTermsYears: z.union([z.number(), z.string()]).default(5),
    termOnFranchiseeIM: z.string().default('Unlimited'),
    dateBusinessStarted: z.string().default(''),
    totalDailyRunTime: z.string().default('5 - 6 hrs'),
    lowPrice: z.union([z.number(), z.string()]).default(0),
    highPrice: z.union([z.number(), z.string()]).default(0),
    serviceRevenue: z.union([z.number(), z.string()]).default(0),
    serviceRevenueYear: z.string().default(''),
    mpexCommission: z.union([z.number(), z.string()]).default(0),
    mpexCommissionYear: z.string().default(''),
    sendleCommission: z.union([z.number(), z.string()]).default(0),
    sendleCommissionYear: z.string().default(''),
    salesCommissionPercent: z.union([z.number(), z.string()]).default(10),
    nabAccreditation: z.string().default('No'),
    nabAccreditationFee: z.union([z.number(), z.string()]).default(0),
    salePrice: z.union([z.number(), z.string()]).default(0),
  }),
});
