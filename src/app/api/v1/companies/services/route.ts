import { POST as postHandler, PUT as putHandler, PATCH as patchHandler } from '@/app/api/companies/services/route';

export const dynamic = 'force-dynamic';

export { postHandler as POST, putHandler as PUT, patchHandler as PATCH };
