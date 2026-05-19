import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, senderEmail, host, port, clientId, tenantId, clientSecret } = body;

    // Direct domain deliverability verification
    if (!senderEmail || !senderEmail.endsWith('@mailplus.com.au')) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Integration Rejected: Outbound campaigns must route natively through an authorized @mailplus.com.au mailbox to maintain domain reputation and SPF/DKIM compliance.',
          contactAdmin: true,
          adminName: 'Ankith Ravindran'
        },
        { status: 400 }
      );
    }

    // Connectors Simulation
    if (type === 'smtp') {
      if (!host || !port) {
        return NextResponse.json(
          { success: false, message: 'SMTP Configuration Error: Host and port are required.' },
          { status: 400 }
        );
      }
      
      // Simulate connection checking
      if (host.includes('error') || senderEmail.includes('admin-blocked')) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Authentication Failure: SMTP handshake failed. Mailbox has strict security settings or incorrect password. Please contact Ankith Ravindran for administrative support and system access credentials.',
            contactAdmin: true,
            adminName: 'Ankith Ravindran'
          },
          { status: 401 }
        );
      }
    } else if (type === 'graph') {
      if (!clientId || !tenantId || !clientSecret) {
        return NextResponse.json(
          { success: false, message: 'Microsoft Graph Integration Error: Client ID, Tenant ID, and Client Secret are required.' },
          { status: 400 }
        );
      }

      // Simulate connection checking
      if (clientSecret === 'invalid' || clientSecret.includes('error') || clientId.includes('block')) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Azure AD App Registration Blocked: Client Secret expired or OAuth scope permissions are insufficient (requires Mail.Send application/delegated scopes). Please contact Ankith Ravindran for administrative support and Azure portal configurations.',
            contactAdmin: true,
            adminName: 'Ankith Ravindran'
          },
          { status: 401 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid integration type. Choose SMTP or Graph API.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Connection successfully established with Outlook infrastructure. Authorized to send outbound campaigns from ${senderEmail}.`
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'System error validating connection.' },
      { status: 500 }
    );
  }
}
