import { z } from 'zod';

const GARBAGE_EMAILS = [
  'admin@test.com',
  'test@test.com',
  'user@test.com',
  'mail@test.com',
  'info@test.com',
  'contact@test.com',
  'no-reply@test.com',
  'noreply@test.com',
  'example@test.com',
];

export const TicketFormSchema = z.object({
  trackingIdentifier: z.string().min(1, { message: "Barcode or Order Number is required." }),
  
  isMasterCase: z.boolean().optional().default(false),
  parentTicketId: z.string().optional().default(""),

  // Custom manual fields if package lookup fails
  customerName: z.string().optional(),
  franchisee: z.string().optional(),
  operatorDetails: z.string().optional(),
  scanDetails: z.string().optional(),
  
  senderDetails: z.object({
    name: z.string().optional().default(""),
    address: z.string().optional().default("")
  }).optional(),
  
  receiverDetails: z.object({
    name: z.string().optional().default(""),
    address: z.string().optional().default("")
  }).optional(),
  
  trackingHistory: z.array(z.string()).optional().default([]),
  currentStatus: z.string().optional().default(""),

  // Contact details fields (Customer)
  customerContactName: z.string().min(1, { message: "Customer contact name is required" }),
  customerCompany: z.string().min(1, { message: "Company name is required" }),
  customerAccountNumber: z.string().min(1, { message: "Account number is required" }),
  customerTier: z.enum(['Standard', 'National Account', 'VIP']).default('Standard'),
  customerEmail: z.string().email({ message: "Invalid customer email address" }),
  customerPhone: z.string().min(8, { message: "Customer phone is too short" }),

  // Contact details fields (Receiver)
  receiverName: z.string().min(1, { message: "Receiver name is required" }),
  receiverAddress: z.string().min(1, { message: "Receiver address is required" }),
  receiverEmail: z.string().email({ message: "Invalid receiver email address" }).optional().or(z.literal('')),
  receiverPhone: z.string().optional().or(z.literal('')),

  // Enquiry dropdown fields
  enquiryType: z.enum([
    'Delayed Item',
    'ETA Request',
    'Dispute of Delivery',
    'POD Request',
    'ATL Image Request',
    'Redelivery Request',
    'Return To Sender Request',
    'Missed Sweep',
    'General Enquiry',
    'Other'
  ]).default('Dispute of Delivery'),

  raisedBy: z.enum([
    'Receiver',
    'Customer',
    'Delivery Carriers',
    'Other'
  ]).default('Receiver'),
  
  priority: z.enum([
    'Standard',
    'High',
    'Urgent'
  ]).default('Standard'),
  
  assignedUser: z.string().min(1, { message: "Assigned user is required." }).refine((val) => val !== 'unassigned', {
    message: "Assigned user is required."
  }),
  followUpDate: z.string().optional().nullable().or(z.literal('')),
  description: z.string().min(10, { message: "Issue description must be at least 10 characters long." }),

  issueCategory: z.array(z.string()).optional().default([]),

  enquirySource: z.string().optional(),
  
  source: z.enum(['Portal (StarTrack)', 'Phone', 'Email'], {
    required_error: "Source is required.",
  }),

  enquirerName: z.string().optional().or(z.literal('')),
  
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

  notes: z.string().optional().default(""),
  
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string()
  })).default([]),
}).superRefine((data, ctx) => {
  if (data.raisedBy === 'Receiver') {
    if (!data.enquirerName || !data.enquirerName.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enquirer name is required",
        path: ["enquirerName"],
      });
    }
    if (data.source === 'Email' && !data.enquirerEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please provide the contact detail matching the selected enquiry source.",
        path: ["enquirerEmail"],
      });
    }
    if (data.source === 'Phone' && !data.enquirerPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please provide the contact detail matching the selected enquiry source.",
        path: ["enquirerPhone"],
      });
    }
  }
});

export type TicketFormValues = z.infer<typeof TicketFormSchema>;
