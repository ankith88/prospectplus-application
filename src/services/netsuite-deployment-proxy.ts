
'use server';

/**
 * @fileoverview Server action to proxy daily deployment logs to NetSuite.
 */

interface DeploymentPayload {
  userId: string;
  userName: string;
  displayName: string;
  email: string;
  area: string;
  startTime: string;
  date: string;
}

/**
 * Synchronizes a Field Sales representative's daily deployment with NetSuite.
 * @param payload The deployment details to transmit.
 */
export async function sendDeploymentToNetSuite(payload: DeploymentPayload): Promise<{ success: boolean; message?: string }> {
    const { userId, userName, displayName, email, area, startTime, date } = payload;
    
    if (!userId || !area) {
        return { success: false, message: 'Invalid payload: userId and area are required.' };
    }

    const baseUrl = "https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl";
    const params = new URLSearchParams({
        script: "2521",
        deploy: "1",
        compid: "1048144",
        "ns-at": "AAEJ7tMQCF0Mu-VvsG7iHzPGS_bXpGZgrYSmFxjVxo7AXy7uSCs",
        userId: userId,
        userName: userName,
        displayName: displayName,
        email: email,
        area: area,
        startTime: startTime,
        date: date,
    });
    
    const url = `${baseUrl}?${params.toString()}`;

    console.log(`[NetSuite Deployment Proxy] Syncing deployment for ${displayName} in ${area}...`);

    try {
        const response = await fetch(url, { method: 'GET' });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[NetSuite Deployment Proxy Error] Status: ${response.status}, URL: ${url}, Body: ${errorBody}`);
            return { success: false, message: `NetSuite API request failed with status ${response.status}.` };
        }

        console.log(`[NetSuite Deployment Proxy] Successfully synced deployment for ${displayName}.`);
        return { success: true };

    } catch (error: any) {
        console.error("[NetSuite Deployment Proxy] Fatal error during fetch:", error);
        return { success: false, message: `An unexpected error occurred: ${error.message}` };
    }
}
