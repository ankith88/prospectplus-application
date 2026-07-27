import { POST as postHandler, PATCH as patchHandler, PUT as putHandler } from '@/app/api/companies/[id]/invoices/[invoiceId]/route';

export const dynamic = 'force-dynamic';

export { postHandler as POST, patchHandler as PATCH, putHandler as PUT };

