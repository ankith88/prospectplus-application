import { describe, it, expect } from 'vitest';
import { isTestLeadOrCompany } from './utils';

describe('isTestLeadOrCompany', () => {
  it('should return false for null or undefined input', () => {
    expect(isTestLeadOrCompany(null)).toBe(false);
    expect(isTestLeadOrCompany(undefined)).toBe(false);
  });

  it('should return false for normal company names', () => {
    expect(isTestLeadOrCompany({ companyName: 'Acme Logistics' })).toBe(false);
    expect(isTestLeadOrCompany({ companyName: 'MailPlus Sydney' })).toBe(false);
    expect(isTestLeadOrCompany({ name: 'Fast Freight Ltd' })).toBe(false);
  });

  it('should return true when companyName contains "test" in any case', () => {
    expect(isTestLeadOrCompany({ companyName: 'Test Company' })).toBe(true);
    expect(isTestLeadOrCompany({ companyName: 'MailPlus Test' })).toBe(true);
    expect(isTestLeadOrCompany({ companyName: 'TEST LEAD' })).toBe(true);
    expect(isTestLeadOrCompany({ companyName: 'testing' })).toBe(true);
    expect(isTestLeadOrCompany({ companyName: 'Test' })).toBe(true);
    expect(isTestLeadOrCompany({ companyName: 'Company Test 123' })).toBe(true);
  });

  it('should check fallback fields like name, company, and leadName', () => {
    expect(isTestLeadOrCompany({ name: 'Test Account' })).toBe(true);
    expect(isTestLeadOrCompany({ company: 'Testing Co' })).toBe(true);
    expect(isTestLeadOrCompany({ leadName: 'Test Lead' })).toBe(true);
  });

  it('should return true if isTest or testing flag is explicitly set', () => {
    expect(isTestLeadOrCompany({ companyName: 'Acme Logistics', isTest: true })).toBe(true);
    expect(isTestLeadOrCompany({ companyName: 'Acme Logistics', testing: true })).toBe(true);
  });
});
