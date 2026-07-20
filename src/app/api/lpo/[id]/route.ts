import { NextRequest, NextResponse } from 'next/server';

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

        const url = `https://us-central1-mp-lpo-connect.cloudfunctions.net/checkLpoStatus?id=${id}`;
        
        const response = await fetch(url);
        
        if (response.status === 404) {
            return NextResponse.json({ success: true, name: null, isActive: false });
        }
        
        if (!response.ok) {
            throw new Error(`Failed to fetch LPO details: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("LPO fetch error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
