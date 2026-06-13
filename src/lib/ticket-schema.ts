import { z } from 'zod';

// List of garbage emails to block
const GARBAGE_EMAILS = [
  'none@none.com',
  'test@test.com',
  'n/a',
  'na@na.com',
  'no@email.com',
  'none@email.com'
];

export const TicketFormSchema = z.object({
  trackingIdentifier: z.string().min(1, { message: "Barcode or Order Number is required" }),
  
  // Package Metadata (fetched automatically)
  customerName: z.string().optional().nullable(),
  franchisee: z.string().optional().nullable(),
  operatorDetails: z.string().optional().nullable(),
  scanDetails: z.string().optional().nullable(),
  senderDetails: z.object({
    name: z.string().optional(),
    address: z.string().optional(),
  }).optional().nullable(),
  receiverDetails: z.object({
    name: z.string().optional(),
    address: z.string().optional(),
  }).optional().nullable(),
  trackingHistory: z.array(z.string()).optional().nullable(),
  currentStatus: z.string().optional().nullable(),

  issueCategory: z.array(z.enum([
    // Address/Routing Queries
    'Incorrect Address: Incomplete',
    'Incorrect Address: No Address',
    'Incorrect Address: P.O. Box',
    'Address: Unserviced Remote Area',
    'Address: Receiver No Longer at Address',
    'Missorted',
    // Delivery Intercepts
    'Address: Not Safe to Leave - Re-delivery Organised',
    'Alternate Delivery Point / Post Office',
    'Alternative Delivery Point',
    'Delivered to Incorrect Address',
    'Dispute of Delivery',
    // Verification Checks
    'Check Address (Incorrect Address)',
    'Check Address (Other)',
    'Check Address (PO/Parcel Locker)',
    'Check Address (Receiver Unknown)',
    // Delay & Damage Logs
    'Delayed Item',
    'Delayed +1 Day',
    'Delayed +2 Days',
    'Delayed >2 Days',
    'Damaged Item',
    'Lost Item',
    'Other'
  ])).min(1, { message: "Please select at least one issue category." }),

  enquirySource: z.enum(['Phone', 'Email'], {
    required_error: "Please select the enquiry source.",
  }),

  enquirerName: z.string().min(1, { message: "Enquirer name is required" }),
  
  enquirerPhone: z.string()
    .min(8, { message: "Phone number is too short" })
    .max(15, { message: "Phone number is too long" })
    .regex(/^[\d\s\+\-\(\)]+$/, { message: "Invalid phone number format" })
    .optional().or(z.literal('')),

  enquirerEmail: z.string().email({ message: "Invalid email address" })
    .refine((email) => !GARBAGE_EMAILS.includes(email.toLowerCase()), {
      message: "Please enter a valid, non-placeholder email address",
    })
    .optional().or(z.literal('')),

  notes: z.string().min(10, { message: "Notes must be at least 10 characters long to provide sufficient detail." }),
  
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string()
  })).default([]),
}).refine(data => {
  // If email is selected as source, ensure email is provided. If phone is selected, ensure phone is provided.
  if (data.enquirySource === 'Email' && !data.enquirerEmail) {
    return false;
  }
  if (data.enquirySource === 'Phone' && !data.enquirerPhone) {
    return false;
  }
  return true;
}, {
  message: "Please provide the contact detail matching the selected enquiry source.",
  path: ["enquirerName"], // Attach error to a common field or form level
});

export type TicketFormValues = z.infer<typeof TicketFormSchema>;
