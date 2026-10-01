'use server';

/**
 * NetSuite Customer Invoice Creation Proxy Service
 * Calls NetSuite Scriptlet 2672 to create customer invoices.
 */

export interface NetSuiteInvoiceLineItem {
  qty: string | number;
  amount: string | number;
  itemId: string;
  itemName: string;
  rate: string | number;
  itemDetails?: string;
}

export interface NetSuiteAdminFeeRow {
  qty: string | number;
  rate: string | number;
}

export interface CreateCustomerInvoicePayload {
  customerId: string;
  franchiseeId: string;
  location?: string;
  department?: string;
  customerPo?: string;
  poNumber?: string;
  periodStartDate: string; // DD/MM/YYYY
  periodEndDate: string;   // DD/MM/YYYY
  invoiceDate?: string;
  tranDate?: string;
  invoiceType?: string;
  lines: NetSuiteInvoiceLineItem[];
  adminFeeRows?: NetSuiteAdminFeeRow[];
}

export interface NetSuiteInvoiceSuccessResponse {
  success: true;
  invoiceCreated: boolean | string;
  invoiceId: string;
  lpoInvoiceId?: string;
  invoiceCustomerId?: string;
  resolvedCustomerId?: string;
  rawResponse?: any;
}

export interface NetSuiteInvoiceErrorResponse {
  success: false;
  error: string;
  rawResponse?: any;
}

export type NetSuiteInvoiceResponse = NetSuiteInvoiceSuccessResponse | NetSuiteInvoiceErrorResponse;

const NETSUITE_SCRIPTLET_BASE_URL = 'https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl';
const SCRIPT_ID = '2672';
const DEPLOY_ID = '1';
const COMP_ID = '1048144';
const NS_AT = 'AAEJ7tMQOZXYC6hnoY0E1O9_8yMjK8hIU9WFl4bilpE1Bhbs3a8';

export async function createCustomerInvoiceInNetSuite(
  payload: CreateCustomerInvoicePayload
): Promise<NetSuiteInvoiceResponse> {
  try {
    if (!payload.customerId || !payload.franchiseeId) {
      return {
        success: false,
        error: 'Both customerId and franchiseeId are required to create an invoice in NetSuite.'
      };
    }

    if (!payload.lines || payload.lines.length === 0) {
      return {
        success: false,
        error: 'At least one invoice line item is required.'
      };
    }

    const poVal = (payload.customerPo || payload.poNumber || '').trim();

    // Format and sanitize string values for payload
    const formattedPayload = {
      customerId: String(payload.customerId).trim(),
      franchiseeId: String(payload.franchiseeId).trim(),
      ...(payload.location ? { location: String(payload.location).trim() } : {}),
      ...(payload.department ? { department: String(payload.department).trim() } : {}),
      ...(poVal ? { customerPo: poVal, poNumber: poVal, otherrefnum: poVal } : {}),
      periodStartDate: String(payload.periodStartDate).trim(),
      periodEndDate: String(payload.periodEndDate).trim(),
      ...(payload.invoiceDate || payload.tranDate ? { invoiceDate: String(payload.invoiceDate || payload.tranDate).trim(), tranDate: String(payload.tranDate || payload.invoiceDate).trim() } : {}),
      ...(payload.invoiceType ? { invoiceType: String(payload.invoiceType).trim() } : {}),
      lines: payload.lines.map(line => ({
        qty: String(line.qty ?? '1'),
        amount: typeof line.amount === 'number' ? line.amount.toFixed(2) : String(line.amount || '0.00'),
        itemId: String(line.itemId || '').trim(),
        itemName: String(line.itemName || '').trim(),
        rate: typeof line.rate === 'number' ? line.rate.toFixed(2) : String(line.rate || '0.00'),
        itemDetails: String(line.itemDetails || '').trim()
      })),
      adminFeeRows: (payload.adminFeeRows || []).map(row => ({
        qty: String(row.qty ?? '1'),
        rate: typeof row.rate === 'number' ? row.rate.toFixed(2) : String(row.rate || '9.00')
      }))
    };

    const queryParams = new URLSearchParams({
      script: SCRIPT_ID,
      deploy: DEPLOY_ID,
      compid: COMP_ID,
      'ns-at': NS_AT,
      operation: 'createCustomerInvoice',
      requestData: JSON.stringify(formattedPayload)
    });

    const targetUrl = `${NETSUITE_SCRIPTLET_BASE_URL}?${queryParams.toString()}`;

    console.log(`[NetSuite Invoice Proxy] Dispatching createCustomerInvoice for Customer: ${formattedPayload.customerId}...`);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });

    const responseText = await response.text();
    let responseData: any;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      console.error('[NetSuite Invoice Proxy] Non-JSON response returned by NetSuite:', responseText);
      return {
        success: false,
        error: `NetSuite returned a non-JSON response (HTTP ${response.status}): ${responseText.slice(0, 200)}`
      };
    }

    // Check if error is present in response body
    if (responseData.error || responseData.err) {
      const errorMsg = typeof responseData.error === 'string'
        ? responseData.error
        : JSON.stringify(responseData.error || responseData.err);
      console.error('[NetSuite Invoice Proxy] NetSuite returned error:', errorMsg);
      return {
        success: false,
        error: errorMsg || 'An error occurred in NetSuite while generating invoice.',
        rawResponse: responseData
      };
    }

    // Validate expected success fields
    const invoiceId = responseData.invoiceId || responseData.id || responseData.internalId;
    if (responseData.invoiceCreated || invoiceId) {
      console.log(`[NetSuite Invoice Proxy] Invoice successfully created. Invoice ID: ${invoiceId}`);
      return {
        success: true,
        invoiceCreated: responseData.invoiceCreated ?? true,
        invoiceId: String(invoiceId),
        lpoInvoiceId: responseData.lpoInvoiceId ? String(responseData.lpoInvoiceId) : undefined,
        invoiceCustomerId: responseData.invoiceCustomerId ? String(responseData.invoiceCustomerId) : undefined,
        resolvedCustomerId: responseData.resolvedCustomerId ? String(responseData.resolvedCustomerId) : undefined,
        rawResponse: responseData
      };
    }

    return {
      success: false,
      error: 'NetSuite response did not contain an invoiceId or invoiceCreated confirmation.',
      rawResponse: responseData
    };

  } catch (err: any) {
    console.error('[NetSuite Invoice Proxy] Network or execution error:', err);
    return {
      success: false,
      error: err?.message || 'Failed to communicate with NetSuite API.'
    };
  }
}
