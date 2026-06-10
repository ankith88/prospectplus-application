import { POST } from '../src/app/api/nurture/process/route';

async function run() {
  console.log('Triggering nurture process engine for lead 2005926...');
  
  // Mock request
  const mockRequest = {
    headers: new Map(),
    json: async () => ({ leadId: '2005926', forceExecute: false })
  } as any;
  
  const response = await POST(mockRequest);
  const data = await response.json();
  
  console.log('Result:', data);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
