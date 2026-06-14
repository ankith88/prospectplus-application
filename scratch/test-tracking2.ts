async function testStartrack() {
  const identifier = "MPX010931042"; // from the test package, order_number
  try {
    const res = await fetch(`https://auspost.com.au/api/tnt/tracking?tracking_id=${identifier}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    console.log('StarTrack status:', res.status);
    const data = await res.text();
    console.log('StarTrack data:', data.substring(0, 200));
  } catch (e) { console.error('StarTrack Error', e); }
}

async function testTge() {
  const identifier = "00593529787604934302"; // from the test package, code
  try {
    const res = await fetch(`https://api.teamglobalexpress.com/tracking?barcode=${identifier}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    console.log('TGE status:', res.status);
    const data = await res.text();
    console.log('TGE data:', data.substring(0, 200));
  } catch (e) { console.error('TGE Error', e); }
}

testStartrack();
testTge();
