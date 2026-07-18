import { z } from 'zod';

export const ALLOWED_COLLECTIONS = ['leads', 'companies', 'users', 'franchisees'] as const;

export const COLLECTION_FIELDS = {
  leads: [
    'status', 'bucket', 'dialerAssigned', 'accountManagerAssigned', 'salesRepAssigned',
    'fieldRepAssigned', 'customerSuccessAssigned', 'franchisee', 'companyName', 'leadType',
    'totalScore', 'dateLeadEntered', 'lastProspected', 'lastContactedDate', 'followUpDate',
    'quoteSentAt', 'signedUpAt', 'cancellationdate'
  ],
  companies: [
    'companyName', 'franchisee', 'dialerAssigned', 'accountManagerAssigned',
    'salesRepAssigned', 'fieldRepAssigned', 'customerSuccessAssigned', 'franchisee_id'
  ],
  users: [
    'activeRole', 'assignedRoles', 'email', 'firstName', 'lastName', 'displayName', 'franchisee'
  ],
  franchisees: [
    'name', 'territory'
  ]
} as const;

export const FilterOpSchema = z.enum([
  '==', '!=', '>', '>=', '<', '<=', 'in', 'array-contains'
]);

export const FilterSchema = z.object({
  field: z.string(),
  op: FilterOpSchema,
  value: z.any()
});

export const QuerySpecSchema = z.object({
  intent: z.enum(['list', 'count', 'aggregate']),
  collection: z.enum(ALLOWED_COLLECTIONS),
  filters: z.array(FilterSchema),
  sort: z.object({
    field: z.string(),
    direction: z.enum(['asc', 'desc'])
  }).optional(),
  limit: z.number().default(25),
  dateRange: z.object({
    field: z.string(),
    from: z.string().optional(), // ISO string or relative like "this_week"
    to: z.string().optional()
  }).optional(),
  groupBy: z.string().optional(),
  humanSummary: z.string()
});

export type QuerySpec = z.infer<typeof QuerySpecSchema>;

/**
 * Validates the spec against the allow-listed fields in code.
 * Throws an error or returns false if invalid.
 */
export function validateQuerySpec(spec: QuerySpec): boolean {
  const allowedFields = COLLECTION_FIELDS[spec.collection] as readonly string[];
  if (!allowedFields) return false;

  // Clamp limit
  if (spec.limit && (spec.limit < 1 || spec.limit > 100)) {
    spec.limit = Math.min(Math.max(spec.limit, 1), 100);
  }

  // Validate filters
  for (const filter of spec.filters) {
    if (!allowedFields.includes(filter.field)) {
      console.warn(`Field "${filter.field}" is not allowed in collection "${spec.collection}"`);
      return false;
    }
  }

  // Validate sort
  if (spec.sort && !allowedFields.includes(spec.sort.field)) {
    console.warn(`Sort field "${spec.sort.field}" is not allowed in collection "${spec.collection}"`);
    return false;
  }

  // Validate dateRange field
  if (spec.dateRange && !allowedFields.includes(spec.dateRange.field)) {
    console.warn(`dateRange field "${spec.dateRange.field}" is not allowed in collection "${spec.collection}"`);
    return false;
  }

  // Validate groupBy field
  if (spec.groupBy && !allowedFields.includes(spec.groupBy)) {
    console.warn(`groupBy field "${spec.groupBy}" is not allowed in collection "${spec.collection}"`);
    return false;
  }

  return true;
}

/**
 * Resolves date boundaries in Australia/Sydney timezone for filtering.
 */
export function getSydneyDateBoundaries(relativeRange: string): { from?: string; to?: string } {
  // We resolve relative dates in Australia/Sydney timezone
  const getSydneyNow = () => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Australia/Sydney',
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric'
    });
    return new Date(formatter.format(new Date()));
  };

  const now = getSydneyNow();
  const startOfDay = (d: Date) => {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy;
  };
  const endOfDay = (d: Date) => {
    const copy = new Date(d);
    copy.setHours(23, 59, 59, 999);
    return copy;
  };

  switch (relativeRange) {
    case 'today': {
      return {
        from: startOfDay(now).toISOString(),
        to: endOfDay(now).toISOString()
      };
    }
    case 'yesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        from: startOfDay(yesterday).toISOString(),
        to: endOfDay(yesterday).toISOString()
      };
    }
    case 'this_week':
    case 'this week': {
      // Sydney week starts Monday
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      const monday = new Date(now.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      return {
        from: startOfDay(monday).toISOString(),
        to: endOfDay(sunday).toISOString()
      };
    }
    case 'last_week':
    case 'last week': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 7;
      const monday = new Date(now.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      return {
        from: startOfDay(monday).toISOString(),
        to: endOfDay(sunday).toISOString()
      };
    }
    case 'this_month':
    case 'this month': {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        from: startOfDay(firstDay).toISOString(),
        to: endOfDay(lastDay).toISOString()
      };
    }
    case 'last_month':
    case 'last month': {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        from: startOfDay(firstDay).toISOString(),
        to: endOfDay(lastDay).toISOString()
      };
    }
    default:
      return {};
  }
}
