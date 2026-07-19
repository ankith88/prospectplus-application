import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { execSync } from 'child_process';

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

        let token = '';
        try {
            const credential = adminApp.options.credential;
            if (credential) {
                const tokenObj = await credential.getAccessToken();
                token = tokenObj.access_token;
            }
        } catch (e) {
            console.warn("Failed to get Firebase Admin credential token, will try fallback:", e);
        }

        // Fallback for local development using gcloud CLI if Admin SDK token is missing or fails
        if (!token && process.env.NODE_ENV === 'development') {
            try {
                token = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
            } catch (err) {
                console.error("Failed to fetch gcloud fallback token:", err);
            }
        }
        
        const url = `https://firestore.googleapis.com/v1/projects/mp-lpo-connect/databases/lpoconnect/documents/lpo/${id}`;
        
        let response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // If unauthorized/forbidden and in dev mode, try gcloud fallback token
        if ((response.status === 401 || response.status === 403) && process.env.NODE_ENV === 'development') {
            try {
                const fallbackToken = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
                if (fallbackToken && fallbackToken !== token) {
                    response = await fetch(url, {
                        headers: {
                            'Authorization': `Bearer ${fallbackToken}`
                        }
                    });
                }
            } catch (err) {
                console.error("Gcloud fallback retry failed:", err);
            }
        }
        
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
