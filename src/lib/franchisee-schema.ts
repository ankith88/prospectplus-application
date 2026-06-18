import { z } from 'zod';

export const SuburbMappingSchema = z.object({
  suburbs: z.string(),
  post_code: z.string(),
  state: z.string(),
  primary_op: z.array(z.string()).or(z.string().transform(s => s ? [s] : [])),
  secondary_op: z.string().nullable().optional().transform(v => v ?? ""),
  next_day: z.boolean().nullable(),
  parent_lpo_id: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export const FranchiseeSchema = z.object({
  internalId: z.string().or(z.number()).transform(val => String(val)),
  name: z.string().nullable().optional().transform(v => v ?? ""),
  mainContact: z.string().nullable().optional().transform(v => v ?? ""),
  email: z.string().email().refine(val => val.endsWith('@mailplus.com.au'), {
    message: "Email must be a @mailplus.com.au address",
  }),
  mobile: z.string().nullable().optional().transform(v => v ?? ""),
  isCompanyOwned: z.boolean()
    .or(z.string().transform(val => val === "Yes" || val === "1"))
    .optional().default(false),
  commissionRate: z.number()
    .or(z.string().transform(val => {
      const num = parseFloat(val);
      if (isNaN(num)) return 0;
      if (val.endsWith('%')) return num / 100;
      return num;
    }))
    .optional().default(0),
  salesRepAssigned: z.string().nullable().optional().transform(v => v ?? ""),
  activeProjects: z.array(z.string())
    .or(z.string().transform(val => val ? val.split(',').map(s => s.trim()) : []))
    .optional().default([]),
  mpExpressActivated: z.boolean()
    .or(z.string().transform(val => val === "Yes" || val === "1"))
    .optional().default(false),
  territoryRaw: z.string().nullable().optional().transform(v => v ?? ""),
  territoryJson: z.array(SuburbMappingSchema).optional().default([]),
  mpStarTrackActivated: z.boolean()
    .or(z.string().transform(val => val === "Yes" || val === "1"))
    .optional().default(false),
  starTrackSuburbRaw: z.string().nullable().optional().transform(v => v ?? ""),
  starTrackSuburbsJson: z.array(SuburbMappingSchema).optional().default([]),
  ausPostSuburbsRaw: z.string().nullable().optional().transform(v => v ?? ""),
  ausPostSuburbsJson: z.array(SuburbMappingSchema).optional().default([]),
  nominatedPostOffice: z.string().nullable().optional().transform(v => v ?? ""),
  nominatedPostOfficeText: z.string().nullable().optional().transform(v => v ?? ""),
});

export const UpdateFranchiseeSchema = z.object({
  name: z.string().nullable().optional(),
  mainContact: z.string().nullable().optional(),
  email: z.string().email().refine(val => val.endsWith('@mailplus.com.au'), {
    message: "Email must be a @mailplus.com.au address",
  }).optional(),
  mobile: z.string().nullable().optional(),
  isCompanyOwned: z.boolean()
    .or(z.string().transform(val => val === "Yes" || val === "1"))
    .optional(),
  commissionRate: z.number()
    .or(z.string().transform(val => {
      const num = parseFloat(val);
      if (isNaN(num)) return 0;
      if (val.endsWith('%')) return num / 100;
      return num;
    }))
    .optional(),
  salesRepAssigned: z.string().nullable().optional(),
  activeProjects: z.array(z.string())
    .or(z.string().transform(val => val ? val.split(',').map(s => s.trim()) : []))
    .optional(),
  mpExpressActivated: z.boolean()
    .or(z.string().transform(val => val === "Yes" || val === "1"))
    .optional(),
  territoryRaw: z.string().nullable().optional(),
  territoryJson: z.array(SuburbMappingSchema).optional(),
  mpStarTrackActivated: z.boolean()
    .or(z.string().transform(val => val === "Yes" || val === "1"))
    .optional(),
  starTrackSuburbRaw: z.string().nullable().optional(),
  starTrackSuburbsJson: z.array(SuburbMappingSchema).optional(),
  ausPostSuburbsRaw: z.string().nullable().optional(),
  ausPostSuburbsJson: z.array(SuburbMappingSchema).optional(),
  nominatedPostOffice: z.string().nullable().optional(),
  nominatedPostOfficeText: z.string().nullable().optional(),
});

export const OperatorSchema = z.object({
  internalId: z.string().or(z.number()).transform(val => String(val)),
  mainFranchiseeId: z.string(),
  linkedFranchiseeIds: z.array(z.string()).optional().default([]),
  title: z.string().nullable().optional().transform(v => v ?? ""),
  givenNames: z.string().nullable().optional().transform(v => v ?? ""),
  surname: z.string().nullable().optional().transform(v => v ?? ""),
  contactPhone: z.string().nullable().optional().transform(v => v ?? ""),
  contactEmail: z.string().nullable().optional().transform(v => v ?? ""),
  operatorStatus: z.string().nullable().optional().transform(v => v ?? ""),
  employment: z.string().nullable().optional().transform(v => v ?? ""),
});

export const UpdateOperatorSchema = z.object({
  mainFranchiseeId: z.string().optional(),
  linkedFranchiseeIds: z.array(z.string()).optional(),
  title: z.string().nullable().optional(),
  givenNames: z.string().nullable().optional(),
  surname: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  contactEmail: z.string().nullable().optional(),
  operatorStatus: z.string().nullable().optional(),
  employment: z.string().nullable().optional(),
});
