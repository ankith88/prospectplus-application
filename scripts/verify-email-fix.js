/**
 * Verification script for the email validation logic refactor.
 * This tests the exact domain label matching logic standardized across the app.
 */

const forbidden = ['na', 'n/a', 'na@', 'test', 'example', 'none', 'placeholder'];

function isValidRealEmail(email) {
  if (!email || !email.includes('@')) return false;
  const parts = email.toLowerCase().split('@');
  if (parts.length !== 2) return false;

  const localPart = parts[0];
  const domainPart = parts[1];

  // Exact match for forbidden local parts
  if (forbidden.includes(localPart)) return false;

  // Split domain into labels and check for exact matches
  const domainLabels = domainPart.split('.');
  if (domainLabels.some(label => forbidden.includes(label))) return false;

  return true;
}

const testCases = [
  // The original bug: 'contact@scarlettfinancial.com' should be VALID even though it contains 'na'
  { email: 'contact@scarlettfinancial.com', expected: true }, 
  
  // Real placeholders: should be INVALID
  { email: 'na@company.com', expected: false },
  { email: 'test@test.com', expected: false },
  { email: 'none@domain.com', expected: false },
  { email: 'info@example.com', expected: false },
  
  // Valid emails that contain forbidden substrings: should be VALID
  { email: 'natasha@gmail.com', expected: true },
  { email: 'don@banana.com', expected: true },
  { email: 'ignatio@company.com', expected: true },
  
  // Invalid formats (sanity check)
  { email: 'N/A', expected: false },
  { email: 'just-text', expected: false },
  { email: 'double@@email.com', expected: false },
];

console.log('--- Starting Email Validation Tests ---');
let passedCount = 0;
let failedCount = 0;

testCases.forEach(({ email, expected }) => {
  const result = isValidRealEmail(email);
  if (result === expected) {
    console.log(`✅ PASS: "${email}" -> Result: ${result}`);
    passedCount++;
  } else {
    console.log(`❌ FAIL: "${email}" -> Result: ${result} (Expected: ${expected})`);
    failedCount++;
  }
});

console.log('---------------------------------------');
console.log(`Summary: ${passedCount} passed, ${failedCount} failed.`);

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log('All tests passed! Logic is safe.');
}
