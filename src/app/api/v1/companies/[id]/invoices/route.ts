import { POST as handler, PUT as putHandler, PATCH as patchHandler } from '@/app/api/companies/[id]/invoices/route';

export const dynamic = 'force-dynamic';

export { handler as POST, putHandler as PUT, patchHandler as PATCH };

