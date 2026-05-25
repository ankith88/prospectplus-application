import { z } from 'zod';

export const SuburbMappingSchema = z.object({
  suburbs: z.string(),
  post_code: z.string(),
  state: z.string(),
  primary_op: z.array(z.string()).or(z.string().transform(s => s ? [s] : [])),
  secondary_op: z.string().nullable().optional().transform(v => v ?? ""),
  next_day: z.boolean().nullable(),
  parent_lpo_id: z.string().optional(),
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
});
