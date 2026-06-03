import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://mailplus.com.au/shipping-surcharge/', {
      next: { revalidate: 3600 }, // cache for 1 hour
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const html = await response.text();

    // Find the first <tbody> block
    const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/i);
    if (!tbodyMatch) {
      throw new Error("Could not find table body in HTML");
    }

    // Find the first <tr> within <tbody>
    const trMatch = tbodyMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/i);
    if (!trMatch) {
      throw new Error("Could not find table row");
    }

    // Extract all <td> within the first <tr>
    const tdMatches = [...trMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
    
    if (tdMatches.length < 3) {
      throw new Error("Table row does not contain enough columns");
    }

    // Clean up HTML tags to get text content for percentages
    const expressRaw = tdMatches[1][1].replace(/<[^>]*>/g, '').trim();
    const premiumRaw = tdMatches[2][1].replace(/<[^>]*>/g, '').trim();

    // Extract numeric values + % just to be safe
    const expressMatch = expressRaw.match(/([\d.]+)\s*%/);
    const premiumMatch = premiumRaw.match(/([\d.]+)\s*%/);

    const expressRate = expressMatch ? parseFloat(expressMatch[1]) : 0;
    const premiumRate = premiumMatch ? parseFloat(premiumMatch[1]) : 0;

    return NextResponse.json({
      express: expressRate,
      premium: premiumRate,
    });
  } catch (error: any) {
    console.error("Error fetching surcharge:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
