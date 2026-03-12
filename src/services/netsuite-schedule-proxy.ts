
'use server';

/**
 * @fileoverview Server action to proxy team schedule updates to NetSuite.
 */

interface SchedulePayload {
  userId: string;
  userName: string;
  workingDays: string[];
  startTime: string;
  endTime: string;
}

/**
 * Synchronizes a Field Sales representative's schedule with NetSuite.
 * @param payload The schedule details to transmit.
 */
export async function sendScheduleToNetSuite(payload: SchedulePayload): Promise<{ success: boolean; message?: string }> {
    const { userId, userName, workingDays, startTime, endTime } = payload;
    
    if (!userId || !userName) {
        return { success: false, message: 'Invalid payload: userId and userName are required.' };
    }

    const baseUrl = "https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl";
    const params = new URLSearchParams({
        script: "2520",
        deploy: "1",
        compid: "1048144",
        "ns-at": "AAEJ7tMQNHf2ksomDVWn8oGQGfSX_aUJubhIDZwCdoSJ60ZrlSY",
        userId: userId,
        userName: userName,
        workingDays: workingDays.join(','),
        startTime: startTime,
        endTime: endTime,
    });
    
    const url = `${baseUrl}?${params.toString()}`;

    console.log(`[NetSuite Schedule Proxy] Syncing schedule for ${userName}...`);

    try {
        const response = await fetch(url, { method: 'GET' });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[NetSuite Schedule Proxy Error] Status: ${response.status}, URL: ${url}, Body: ${errorBody}`);
            return { success: false, message: `NetSuite API request failed with status ${response.status}.` };
        }

        console.log(`[NetSuite Schedule Proxy] Successfully synced schedule for ${userName}.`);
        return { success: true };

    } catch (error: any) {
        console.error("[NetSuite Schedule Proxy] Fatal error during fetch:", error);
        return { success: false, message: `An unexpected error occurred: ${error.message}` };
    }
}
