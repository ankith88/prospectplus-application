import { assignKerryONeillToLpoBucket } from '../src/services/lpo-account-manager-service';

async function main() {
  console.log('Running assign Kerry O\'Neill as Account Manager to all LPO Network leads and companies...');
  try {
    const result = await assignKerryONeillToLpoBucket();
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error running assignment script:', err);
    process.exit(1);
  }
}

main();
