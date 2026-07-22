import assert from 'assert';
import { evaluateDuplicateScore, cleanAbn, extractEmailDomain, normalizeCompanyName } from './duplicate-detector';

console.log('Running duplicate-detector tests...');

// 1. ABN Cleaning
assert.strictEqual(cleanAbn('12 345 678 901'), '12345678901');
assert.strictEqual(cleanAbn('ABN: 98-765-432-109'), '98765432109');
assert.strictEqual(cleanAbn(null), '');

// 2. Email Domain Extraction
assert.strictEqual(extractEmailDomain('john@acme.com.au'), 'acme.com.au');
assert.strictEqual(extractEmailDomain('support@techcorp.org'), 'techcorp.org');
assert.strictEqual(extractEmailDomain('user@gmail.com'), null);
assert.strictEqual(extractEmailDomain('user@outlook.com'), null);

// 3. Company Name Normalization
assert.strictEqual(normalizeCompanyName('Acme Logistics Pty Ltd'), 'acme logistics');
assert.strictEqual(normalizeCompanyName('Tech Solutions Incorporated'), 'tech solutions');

// 4. Exact ABN Match Test (100% High)
const abnMatch = evaluateDuplicateScore(
  { companyName: 'Acme Pty Ltd', abn: '12 345 678 901' },
  { companyName: 'Acme Logistics', abn: '12345678901' }
);
assert.strictEqual(abnMatch.isMatch, true);
assert.strictEqual(abnMatch.confidence, 'High');
assert.strictEqual(abnMatch.score, 100);
assert.ok(abnMatch.matchedCriteria.includes('Exact ABN Match'));

// 5. Triple Match: Company + Address + Email Domain (95% High)
const tripleMatch = evaluateDuplicateScore(
  {
    companyName: 'Apex Express Pty Ltd',
    customerServiceEmail: 'contact@apexexpress.com.au',
    address: { street: '10 Park Street', city: 'Sydney', state: 'NSW', zip: '2000', country: 'Australia' }
  },
  {
    companyName: 'Apex Express',
    customerServiceEmail: 'info@apexexpress.com.au',
    address: { street: '10 Park St', city: 'Sydney', state: 'NSW', zip: '2000', country: 'Australia' }
  }
);
assert.strictEqual(tripleMatch.isMatch, true);
assert.strictEqual(tripleMatch.confidence, 'High');
assert.strictEqual(tripleMatch.score, 95);
assert.ok(tripleMatch.matchedCriteria.includes('Company Name'));
assert.ok(tripleMatch.matchedCriteria.includes('Address'));
assert.ok(tripleMatch.matchedCriteria.includes('Email Domain'));

// 6. Company + Domain Match (75% Medium)
const domainMatch = evaluateDuplicateScore(
  { companyName: 'Quantum Freight', customerServiceEmail: 'orders@quantumfreight.com' },
  { companyName: 'Quantum Freight Pty Ltd', customerServiceEmail: 'admin@quantumfreight.com' }
);
assert.strictEqual(domainMatch.isMatch, true);
assert.strictEqual(domainMatch.confidence, 'Medium');
assert.strictEqual(domainMatch.score, 75);

// 7. No Match Test
const noMatch = evaluateDuplicateScore(
  { companyName: 'Alpha Logistics', customerServiceEmail: 'info@alpha.com' },
  { companyName: 'Beta Supplies', customerServiceEmail: 'info@beta.com' }
);
assert.strictEqual(noMatch.isMatch, false);
assert.strictEqual(noMatch.confidence, 'None');

console.log('✅ All duplicate-detector tests passed successfully!');
