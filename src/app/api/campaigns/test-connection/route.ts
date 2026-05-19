import { NextResponse } from 'next/server';
import { verifyPhysicalConnection } from '@/lib/email-dispatcher';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await verifyPhysicalConnection(body);
    
    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: result.message,
          contactAdmin: true,
          adminName: 'Ankith Ravindran'
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'System error validating connection.' },
      { status: 500 }
    );
  }
}

