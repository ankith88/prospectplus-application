import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const identifier = searchParams.get('identifier');
  const type = searchParams.get('type'); // 'startrack' or 'tge'

  if (!identifier || !type) {
    return NextResponse.json({ error: 'Missing identifier or type' }, { status: 400 });
  }

  try {
    let status = 'Unknown';
    let delivered = false;
    let estimated_delivery_date: string | null = null;
    let last_location: string | null = null;

    if (type === 'startrack') {
      // Proxy/Scrape Startrack (Australia Post)
      // Since AusPost tracking API requires auth, we attempt a public scrape or mock
      // This is a placeholder for the actual scraping logic
      
      // MOCK LOGIC for demonstration
      status = 'In Transit with Startrack';
      delivered = false;
      estimated_delivery_date = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(); // +2 days
      last_location = 'Sydney Transit Centre';

      // Real implementation would look like:
      // const res = await fetch(`https://auspost.com.au/api/tnt/tracking?tracking_id=${identifier}`, { headers: { 'User-Agent': 'Mozilla...' }});
      // const data = await res.json();
      // status = data.tracking_results[0].status;
      // delivered = status.toLowerCase().includes('delivered');
    } else if (type === 'tge') {
      // Proxy/Scrape Team Global Express
      // MOCK LOGIC
      status = 'Arrived at Depot';
      delivered = false;
      estimated_delivery_date = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(); // +1 day
      last_location = 'Melbourne Sort Facility';

      // Real implementation would look like:
      // const res = await fetch(`https://api.teamglobalexpress.com/tracking?barcode=${identifier}`);
      // const data = await res.json();
      // status = data.latestEvent.description;
    } else {
      return NextResponse.json({ error: 'Unsupported courier type' }, { status: 400 });
    }

    // Add some random delay/variance for realism
    await new Promise(r => setTimeout(r, 800));

    // To show a realistic delivered state for testing, if identifier starts with 'D' make it delivered
    if (identifier.toLowerCase().startsWith('d')) {
      status = 'Delivered';
      delivered = true;
      estimated_delivery_date = null;
      last_location = 'Left in a safe place';
    }

    return NextResponse.json({
      status,
      delivered,
      estimated_delivery_date,
      last_location,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching tracking:', error);
    return NextResponse.json({ error: 'Failed to fetch tracking data' }, { status: 500 });
  }
}
