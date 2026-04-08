import { Contact, DiscoveryData } from "./types";

/**
 * Validates if an email is "real" and not a placeholder like N/A, test@test.com, etc.
 * This version uses exact domain label matching to avoid false positives.
 */
export function isValidRealEmail(email: string | undefined): boolean {
  if (!email) return false;
  const lowerEmail = email.toLowerCase().trim();
  
  // Basic format check
  if (!lowerEmail.includes('@') || !lowerEmail.includes('.')) return false;
  
  const forbidden = ['n/a', 'na', 'none', 'nil', 'tba', 'tbc', 'test', 'example', 'placeholder', 'noemail'];
  
  // Check the local part (before @)
  const parts = lowerEmail.split('@');
  if (parts.length !== 2) return false;
  
  const localPart = parts[0];
  if (forbidden.includes(localPart)) return false;
  
  // Check the domain labels (e.g., "test" in "test.com")
  const domainParts = parts[1].split('.');
  if (domainParts.some(p => forbidden.includes(p))) return false;
  
  return true;
}

/**
 * Extracts unique contacts from discovery data.
 * Checks for "Person Spoken With" and "Decision Maker".
 */
export function extractContactsFromDiscoveryData(data: Partial<DiscoveryData>): Omit<Contact, 'id'>[] {
  const contacts: Omit<Contact, 'id'>[] = [];
  const seenNames = new Set<string>();

  // Helper to add a contact if valid and unique
  const addIfValid = (name?: string, title?: string, email?: string, phone?: string) => {
    if (!name || name.trim() === '' || name.toLowerCase() === 'n/a') return;
    
    // Simple deduplication by name (case-insensitive)
    const normalizedName = name.trim().toLowerCase();
    if (seenNames.has(normalizedName)) return;
    
    // Clean fields
    const cleanEmail = isValidRealEmail(email) ? email!.trim() : '';
    const cleanPhone = (phone && phone.toLowerCase() !== 'n/a') ? phone.trim() : '';
    const cleanTitle = (title && title.toLowerCase() !== 'n/a') ? title.trim() : '';

    contacts.push({
      name: name.trim(),
      title: cleanTitle,
      email: cleanEmail,
      phone: cleanPhone,
    });
    
    seenNames.add(normalizedName);
  };

  // 1. Person Spoken With
  addIfValid(
    data.personSpokenWithName,
    data.personSpokenWithTitle,
    data.personSpokenWithEmail,
    data.personSpokenWithPhone
  );

  // 2. Decision Maker
  addIfValid(
    data.decisionMakerName,
    data.decisionMakerTitle,
    data.decisionMakerEmail,
    data.decisionMakerPhone
  );

  return contacts;
}
