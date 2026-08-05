import { NextResponse } from 'next/server';

function validateABNMod89(abnRaw: string): boolean {
  const abn = String(abnRaw).replace(/\s+/g, '');
  if (!/^\d{11}$/.test(abn)) return false;

  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    let digit = parseInt(abn[i], 10);
    if (i === 0) digit -= 1;
    sum += digit * weights[i];
  }
  return sum % 89 === 0;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const abnQuery = searchParams.get('abn') || '';
    const cleanABN = abnQuery.replace(/\s+/g, '');

    if (!cleanABN) {
      return NextResponse.json({ success: false, message: 'ABN parameter is required.' }, { status: 400 });
    }

    const isValid = validateABNMod89(cleanABN);
    if (!isValid) {
      return NextResponse.json({
        success: false,
        valid: false,
        message: 'Invalid ABN number. Checksum validation failed.',
      });
    }

    // Try fetching from ABR Lookup service if GUID configured or fallback resolution
    let entityName = '';
    let status = 'Active';
    const abrGuid = process.env.ABR_GUID || process.env.NEXT_PUBLIC_ABR_GUID;

    if (abrGuid) {
      try {
        const abrUrl = `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${cleanABN}&guid=${abrGuid}&callback=callback`;
        const res = await fetch(abrUrl);
        const text = await res.text();
        const jsonMatch = text.match(/callback\((.*)\)/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[1]);
          if (data && data.EntityName) {
            entityName = data.EntityName;
          }
          if (data && data.AbnStatus) {
            status = data.AbnStatus;
          }
        }
      } catch (err) {
        console.warn('ABR lookup fetch failed, using fallback checksum validation:', err);
      }
    }

    // Formatted ABN string (XX XXX XXX XXX)
    const formattedABN = `${cleanABN.substring(0, 2)} ${cleanABN.substring(2, 5)} ${cleanABN.substring(5, 8)} ${cleanABN.substring(8, 11)}`;

    return NextResponse.json({
      success: true,
      valid: true,
      abn: cleanABN,
      formattedABN,
      entityName: entityName || '',
      status,
      message: 'ABN is valid.',
    });
  } catch (error: any) {
    console.error('Error during ABN lookup:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error.' }, { status: 500 });
  }
}
