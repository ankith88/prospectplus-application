import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;
        
        if (!id) {
            return NextResponse.json({ success: false, error: 'Missing LPO ID' }, { status: 400 });
        }

        // Get access token from the firebase-admin credential
        const credential = adminApp.options.credential;
        if (!credential) {
            throw new Error("No credential found in adminApp");
        }
        
        // This relies on the Google Credential providing a token with appropriate scopes
        const tokenObj = await credential.getAccessToken();
        const token = tokenObj.access_token;
        
        const url = `https://firestore.googleapis.com/v1/projects/mp-lpo-connect/databases/lpoconnect/documents/lpo/${id}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 404) {
            return NextResponse.json({ success: true, name: null, isActive: false });
        }
        
        if (!response.ok) {
            throw new Error(`Failed to fetch LPO details: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        const fields = data.fields || {};
        const name = fields.name?.stringValue;
        
        // Determine if account is active or created
        const isActive = fields.active?.booleanValue || 
                         fields.registered?.booleanValue || 
                         fields.hasAccount?.booleanValue || 
                         (fields.status?.stringValue && ['active', 'registered', 'joined', 'completed'].includes(fields.status.stringValue.toLowerCase())) ||
                         !!fields.userId?.stringValue || 
                         !!fields.ownerId?.stringValue ||
                         !!fields.userUid?.stringValue ||
                         true; // If the document exists in lpo-connect, it indicates active/created
        
        return NextResponse.json({ success: true, name, isActive });
    } catch (error: any) {
        console.error("LPO fetch error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
