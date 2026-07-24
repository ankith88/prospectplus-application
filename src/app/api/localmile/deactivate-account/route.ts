import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, leadId, customer_id } = body;
    const targetLeadId = leadId || customer_id;

    if (!email || !targetLeadId) {
      return NextResponse.json(
        { success: false, message: 'Missing required parameters: email and leadId' },
        { status: 400 }
      );
    }

    const localMileApiKey = process.env.LOCALMILE_PLUS_API_KEY || process.env.PROSPECTPLUS_API_KEY || process.env.EXTERNAL_API_KEY || "454e75f843954875ccff72537d7702ba1ab6f65c";
    const fallbackApiKey = "f7d8c2e1b0a943ef8215d6c7b8a90123fe456789abcd0123456789abcdef0123";

    console.log(`[API /localmile/deactivate-account] Deactivating LocalMile account for ${email} (customer_id: ${targetLeadId})...`);

    const candidateUrls = [
      "https://us-central1-localmile-plus.cloudfunctions.net/deactivateExternalUserAccount",
      "https://us-central1-localmile-plus.cloudfunctions.net/api/deactivateExternalUserAccount",
      "https://us-central1-localmile-plus.cloudfunctions.net/api/v1/deactivateExternalUserAccount",
      "https://us-central1-localmile-plus.cloudfunctions.net/api/api/v1/deactivateExternalUserAccount",
      "https://us-central1-localmile-plus.cloudfunctions.net/api/api/v1/accounts/deactivate",
      "https://localmile.plus/api/v1/accounts/deactivate"
    ];

    let lastStatus = 404;
    let lastResponseText = '';

    for (const targetUrl of candidateUrls) {
      for (const apiKeyToTry of [localMileApiKey, fallbackApiKey]) {
        try {
          console.log(`[API /localmile/deactivate-account] Trying endpoint: ${targetUrl} (key: ${apiKeyToTry.substring(0, 6)}...)`);
          const response = await fetch(targetUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKeyToTry
            },
            body: JSON.stringify({
              email,
              customer_id: targetLeadId,
              leadId: targetLeadId
            })
          });

          lastStatus = response.status;
          lastResponseText = await response.text();

          if (response.ok) {
            console.log(`[API /localmile/deactivate-account] Successfully deactivated account for ${email} via ${targetUrl}`);
            return NextResponse.json({ success: true, message: lastResponseText, endpoint: targetUrl });
          } else if (response.status !== 404 && response.status !== 401) {
            console.log(`[API /localmile/deactivate-account] Endpoint ${targetUrl} reached with status ${response.status}: ${lastResponseText}`);
            return NextResponse.json(
              { success: false, status: response.status, message: lastResponseText, endpoint: targetUrl },
              { status: response.status }
            );
          }
        } catch (err: any) {
          console.warn(`[API /localmile/deactivate-account] Endpoint ${targetUrl} failed with error:`, err.message);
        }
      }
    }

    console.error(`[API /localmile/deactivate-account] All candidate endpoints returned 404 or failed.`);
    return NextResponse.json(
      { success: false, status: lastStatus, message: lastResponseText },
      { status: lastStatus }
    );
  } catch (error: any) {
    console.error("[API /localmile/deactivate-account] Fatal error:", error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
