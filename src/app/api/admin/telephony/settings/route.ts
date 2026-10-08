import { NextRequest, NextResponse } from 'next/server';
import { getTelephonySettingsServer, updateTelephonySettingsServer } from '@/services/telephony-server';

export async function GET() {
  try {
    const settings = await getTelephonySettingsServer();
    // Return sanitized settings (mask sensitive token lengths if needed)
    return NextResponse.json({
      success: true,
      settings: {
        ...settings,
        aircall: {
          ...settings.aircall,
          apiId: settings.aircall?.apiId ? '••••••••' + settings.aircall.apiId.slice(-4) : '',
          apiToken: settings.aircall?.apiToken ? '••••••••' : '',
        },
        dialpad: {
          ...settings.dialpad,
          apiKey: settings.dialpad?.apiKey ? '••••••••' + settings.dialpad.apiKey.slice(-4) : '',
        }
      }
    });
  } catch (error: any) {
    console.error('[Admin Telephony API] GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { activeProvider, aircall, dialpad, updatedBy } = body;

    if (activeProvider && !['aircall', 'dialpad'].includes(activeProvider)) {
      return NextResponse.json({ success: false, error: 'Invalid provider. Must be "aircall" or "dialpad"' }, { status: 400 });
    }

    const updated = await updateTelephonySettingsServer(
      {
        activeProvider,
        aircall,
        dialpad,
      },
      updatedBy || 'superadmin'
    );

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    console.error('[Admin Telephony API] POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
