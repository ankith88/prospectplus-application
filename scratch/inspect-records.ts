import { NextRequest } from 'next/server';
import { GET } from '../src/app/api/account-lookup/route';

async function testRoute(q: string) {
  console.log(`\nTesting API route for: "${q}"`);
  // Create a mock NextRequest
  const req = new NextRequest(`http://localhost:3000/api/account-lookup?q=${encodeURIComponent(q)}`);
  const response = await GET(req);
  console.log(`Status: ${response.status}`);
  const data = await response.json();
  console.log('Response JSON:', JSON.stringify(data, null, 2));
}

async function main() {
  await testRoute('0402712233');
  await testRoute('175 pitt st');
}

main().catch(console.error);
