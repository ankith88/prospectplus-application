import { NextRequest } from 'next/server';
import { GET } from '../src/app/api/account-lookup/route';

async function testRoute(q: string, type: string) {
  console.log(`\nTesting API route for q: "${q}" and type: "${type}"`);
  // Create a mock NextRequest
  const req = new NextRequest(`http://localhost:3000/api/account-lookup?q=${encodeURIComponent(q)}&type=${type}`);
  const response = await GET(req);
  console.log(`Status: ${response.status}`);
  const data = await response.json();
  console.log('Response JSON:', JSON.stringify(data, null, 2));
}

async function main() {
  await testRoute('vivacity', 'company');
  await testRoute('vivacity prop', 'company');
}

main().catch(console.error);
