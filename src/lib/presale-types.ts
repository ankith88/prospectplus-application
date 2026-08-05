import { z } from 'zod';

export interface PresaleMainDetails {
  franchiseeName?: string;
  tradingEntity: string;
  mainContact: string;
  mobileNumber: string;
  email: string;
  abn: string;
  dateListedForSale: string;
  address: string;
  streetNumberAndName?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  dateBusinessStarted?: string;
  expiryDate?: string;
  ultimateExpiryDate?: string;
  unlimitedTermOffer?: string; // 'Yes' | 'No'
}

export type DeedOption = 'option_1' | 'option_2' | 'option_3';

export interface PresaleDeedOfVariation {
  status: 'not_started' | 'sent' | 'option_selected' | 'signed_online' | 'pdf_uploaded';
  selectedOption?: DeedOption;
  party1Name?: string;
  party1Address?: string;
  party2Name?: string;
  party2Address?: string;
  party3Name?: string;
  dateSent?: string;
  sentAt?: string;
  sentToEmail?: string;
  signedAt?: string;
  signerName?: string;
  signerEmail?: string;
  signatureDataUrl?: string;
  directorSignerName?: string; // Chris Burgess
  directorSignedAt?: string;
  directorSignatureDataUrl?: string;
  pdfFileName?: string;
  pdfDataUrl?: string;
  publicToken?: string;
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

export type StepStatus = 'Not Started' | 'In Progress' | 'Pending Review' | 'Completed';

export interface PresaleRecord {
  id: string; // franchiseeId
  franchiseeId: string;
  franchiseeName: string;
  status: 'Step 1: Main Details' | 'Step 2: Deed Pending' | 'Step 3: Verification Pending' | 'Step 4: Presales Details' | 'Active Presale' | 'Sold' | 'Cancelled';
  step1Status: StepStatus;
  step2Status: StepStatus;
  step3Status: StepStatus;
  step4Status: StepStatus;
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
