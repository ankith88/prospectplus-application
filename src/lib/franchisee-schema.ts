import { z } from 'zod';

export const SuburbMappingSchema = z.object({
  suburbs: z.string(),
  post_code: z.string(),
  state: z.string(),
  primary_op: z.array(z.string()),
  secondary_op: z.string(),
  next_day: z.boolean().nullable(),
  parent_lpo_id: z.string().optional(),
});

export const FranchiseeSchema = z.object({
  internalId: z.string().or(z.number()).transform(val => String(val)),
  name: z.string(),
  mainContact: z.string(),
  email: z.string().email().refine(val => val.endsWith('@mailplus.com.au'), {
    message: "Email must be a @mailplus.com.au address",
  }),
  mobile: z.string(),
  isCompanyOwned: z.boolean().or(z.enum(["Yes", "No"]).transform(val => val === "Yes")),
  commissionRate: z.number().or(z.string().transform(val => {
    const num = parseFloat(val);
    if (val.endsWith('%')) {
      return num / 100;
    }
    return num;
  })),
  salesRepAssigned: z.string(),
  activeProjects: z.array(z.string()).or(z.string().transform(val => val.split(',').map(s => s.trim()))),
  mpExpressActivated: z.boolean().or(z.enum(["Yes", "No"]).transform(val => val === "Yes")),
  territoryRaw: z.string(),
  territoryJson: z.array(SuburbMappingSchema),
  mpStarTrackActivated: z.boolean().or(z.enum(["Yes", "No"]).transform(val => val === "Yes")),
  starTrackSuburbRaw: z.string(),
  starTrackSuburbsJson: z.array(SuburbMappingSchema),
  ausPostSuburbsRaw: z.string(),
  ausPostSuburbsJson: z.array(SuburbMappingSchema),
});
