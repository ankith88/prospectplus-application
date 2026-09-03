export interface AccountManagerInfo {
  name?: string;
  mobile?: string;
  email?: string;
  calendly?: string;
}

export interface FranchiseeInfo {
  name?: string;
  mainContact?: string;
  email?: string;
  mobile?: string;
}

export interface TemplateReplacementContext {
  lead?: any;
  contact?: any;
  accountManager?: AccountManagerInfo;
  salesRep?: string;
  franchisee?: FranchiseeInfo;
  senderEmail?: string;
  scheduledServiceDate?: string;
  customLinks?: {
    bookingUrlId?: string;
    generalBookingUrlId?: string;
    scfLink?: string;
    sofLink?: string;
    localMileLink?: string;
    localMileActivationLink?: string;
    localMileSecurityCode?: string;
    acceptUrl?: string;
    trialsRemaining?: number | string;
    ticketNumber?: string;
    trackingIdentifier?: string;
    packageCode?: string;
    connoteNumber?: string;
    receiverName?: string;
    receiverCompanyName?: string;
    receiverAddress?: string;
  };
}

export function formatMobileForDisplay(phone: string | null | undefined): string {
  if (!phone) return '';
  const trimmed = String(phone).trim();
  if (!trimmed) return '';

  // Extract clean digits and optional leading +
  let cleaned = trimmed.replace(/[^\d+]/g, '');

  // Normalize international Australian format (+614... or 614...) to local 04...
  if (cleaned.startsWith('+614') && cleaned.length === 12) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('614') && cleaned.length === 11) {
    cleaned = '0' + cleaned.slice(2);
  }

  // Australian 10-digit mobile numbers starting with 04 (e.g. 0436930218 -> 0436 930 218)
  if (cleaned.startsWith('04') && cleaned.length === 10) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }

  // Australian 10-digit landline numbers starting with 02, 03, 07, 08 (e.g. 0283599676 -> 02 8359 9676)
  if (/^0[2378]\d{8}$/.test(cleaned)) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 6)} ${cleaned.slice(6)}`;
  }

  return trimmed;
}

export function extractUserMobile(user: any): string {
  if (!user) return '';
  const raw = (
    user.mobileNumber ||
    user.mobile ||
    user.phoneNumber ||
    user.phone ||
    user.aircallPhoneNumber ||
    user.aircallPhone ||
    user.telephone ||
    ''
  ).trim();
  return formatMobileForDisplay(raw);
}

/**
 * Replaces all placeholders in an email template or subject string.
 * Handles URL-encoded braces (%7B%7B / %7D%7D) created by rich-text editors inside href attributes,
 * prevents duplicate https:// prefixes in links, and provides fallbacks for missing data.
 */
export function replaceTemplatePlaceholders(
  templateText: string,
  context: TemplateReplacementContext
): string {
  if (!templateText) return '';

  let content = templateText;

  // 1. Decode URL-encoded double curly braces (often added by rich-text / HTML email editors)
  content = content
    .replace(/%7B%7B/gi, '{{')
    .replace(/%7D%7D/gi, '}}');

  // 2. Extract values from context with robust fallbacks
  const lead = context.lead || {};
  const contact = context.contact || {};
  const am = context.accountManager || {};
  const franchisee = context.franchisee || {};
  const links = context.customLinks || {};

  // Contact / Lead Person Name
  const contactName =
    contact.name ||
    lead.contactPersonName ||
    lead.contactName ||
    lead.displayName ||
    lead.companyName ||
    'Valued Customer';
  const contactFirstName = (contact.firstName || contactName.split(' ')[0] || 'Valued Customer').trim();
  const contactEmail = contact.email || lead.customerServiceEmail || lead.email || '';
  const contactPhone = contact.phone || lead.phone || '';

  // Company Name
  const companyName = lead.companyName || lead.tradingName || lead.company || 'Your Business';

  // Account Manager Details (Fetched strictly from users collection via context.accountManager)
  const amName = am.name || lead.accountManagerAssigned || lead.salesRepAssigned || context.salesRep || 'MailPlus Team';
  const rawAmMobile = am.mobile || lead.accountManagerMobile || lead.accountManagerPhone || '';
  const amMobile = formatMobileForDisplay(rawAmMobile);
  const amEmail = am.email || lead.accountManagerEmail || '';
  const amCalendly = am.calendly || lead.accountManagerCalendly || lead.salesRepAssignedCalendlyLink || '';

  // Sales Rep Name
  const salesRepName = context.salesRep || lead.salesRepAssigned || amName;

  // City
  const leadCity = lead.address?.city || lead.city || '';

  // Booking Links
  const bookingId = links.generalBookingUrlId || lead.generalBookingUrlId || links.bookingUrlId || lead.bookingUrlId || lead.id || '';
  const generalBookingLink = bookingId ? `https://prospectplus.com.au/book/${bookingId}` : '';

  const contactBookingId = links.bookingUrlId || lead.bookingUrlId || bookingId;
  const contactBookingLink = contactBookingId ? `https://prospectplus.com.au/book/${contactBookingId}` : '';

  // SCF & SOF Links
  const scfLink = links.scfLink || lead.dynamicScfUrl || (lead.id ? `https://prospectplus.com.au/scf/${lead.id}` : '');
  const sofLink = links.sofLink || lead.sofLink || lead.standingOrderFormLink || '';

  // LocalMile Links
  const localMileLink = links.localMileLink || lead.localMileRegistrationLink || '';
  const localMileActivationLink = links.localMileActivationLink || contact.localMilePlusAuthLink || lead.localMileActivationLink || localMileLink;
  const localMileSecurityCode = links.localMileSecurityCode || contact.securityCode || lead.securityCode || lead.localMileSecurityCode || '';

  // Trials Remaining
  let trialsRemainingStr = '5';
  if (links.trialsRemaining !== undefined && links.trialsRemaining !== null) {
    trialsRemainingStr = String(links.trialsRemaining);
  } else if (lead.localMileTrialsRemaining !== undefined && lead.localMileTrialsRemaining !== null) {
    trialsRemainingStr = String(lead.localMileTrialsRemaining);
  }

  // Franchisee
  const franName = franchisee.name || lead.franchisee || 'MailPlus';
  const franMainContact = franchisee.mainContact || franchisee.name || franName;
  const franEmail = franchisee.email || lead.franchiseeEmail || '';
  const rawFranMobile = franchisee.mobile || lead.franchiseeMobile || lead.franchiseePhone || '';
  const franMobile = formatMobileForDisplay(rawFranMobile);

  // Prospect ID
  const prospectPlusId = lead.prospectPlusId || lead.id || '';

  // Receiver & Ticket details
  const receiverName = links.receiverName || lead.receiverDetails?.name || '';
  const receiverCompanyName = links.receiverCompanyName || lead.receiverDetails?.companyName || lead.receiverDetails?.company || lead.receiverCompanyName || lead.receiverCompany || '';
  const receiverAddress = links.receiverAddress || lead.receiverDetails?.address || '';
  const ticketNumber = links.ticketNumber || lead.ticketNumber || '';
  const trackingId = links.trackingIdentifier || lead.trackingIdentifier || '';
  const packageCode = links.packageCode || lead.packageCode || lead.packages?.code || lead.packageInfo?.code || trackingId;
  const connoteNumber = links.connoteNumber || lead.connoteNumber || lead.connote_number || lead.packages?.connote_number || lead.packageInfo?.connoteNumber || '';
  const acceptUrl = links.acceptUrl || lead.acceptUrl || '';
  const scheduledServiceDate = context.scheduledServiceDate || lead.scheduledServiceDate || '';
  const senderEmail = context.senderEmail || '';

  // Function to replace URL placeholders handling optional leading https:// or http:// in href attributes
  const replaceUrlPlaceholder = (str: string, patterns: RegExp[], replacementUrl: string): string => {
    if (!replacementUrl) {
      for (const pattern of patterns) {
        str = str.replace(pattern, '');
      }
      return str;
    }
    for (const pattern of patterns) {
      const httpPattern = new RegExp(`https?:\\/\\/${pattern.source}`, 'gi');
      str = str.replace(httpPattern, replacementUrl);
      str = str.replace(pattern, replacementUrl);
    }
    return str;
  };

  // Replace URL placeholders cleanly
  content = replaceUrlPlaceholder(content, [
    /\{\{\s*Lead\.GeneralBookingLink\s*\}\}/gi,
    /\{\{\s*GeneralBookingLink\s*\}\}/gi,
    /\{\{\s*Lead\.GeneralBookingUrl\s*\}\}/gi,
    /\{\{\s*GeneralBookingUrl\s*\}\}/gi,
    /\{\{\s*Lead\.BookingLink\s*\}\}/gi,
    /\{\{\s*booking_link\s*\}\}/gi,
    /\{\{\s*booking_url\s*\}\}/gi,
  ], generalBookingLink);

  content = replaceUrlPlaceholder(content, [
    /\{\{\s*Lead\.ContactBookingLink\s*\}\}/gi,
    /\{\{\s*ContactBookingLink\s*\}\}/gi,
    /\{\{\s*Lead\.BookingUrlId\s*\}\}/gi,
  ], contactBookingLink);

  content = replaceUrlPlaceholder(content, [
    /\{\{\s*Lead\.SCFLink\s*\}\}/gi,
    /\{\{\s*SCFLink\s*\}\}/gi,
    /\{\{\s*scf_link\s*\}\}/gi,
    /\{\{\s*scf_url\s*\}\}/gi,
  ], scfLink);

  content = replaceUrlPlaceholder(content, [
    /\{\{\s*Lead\.StandingOrderFormLink\s*\}\}/gi,
    /\{\{\s*Lead\.SOFLink\s*\}\}/gi,
    /\{\{\s*Lead\.StandingOrderLink\s*\}\}/gi,
    /\{\{\s*StandingOrderFormLink\s*\}\}/gi,
    /\{\{\s*SOFLink\s*\}\}/gi,
    /\{\{\s*StandingOrderLink\s*\}\}/gi,
    /\{\{\s*sof_link\s*\}\}/gi,
    /\{\{\s*sof_url\s*\}\}/gi,
    /\{\{\s*SOF_Link\s*\}\}/gi,
  ], sofLink);

  content = replaceUrlPlaceholder(content, [
    /\{\{\s*Lead\.LocalMileRegistrationLink\s*\}\}/gi,
  ], localMileLink);

  content = replaceUrlPlaceholder(content, [
    /\{\{\s*Lead\.LocalMileActivationLink\s*\}\}/gi,
    /\{\{\s*LocalMileActivationLink\s*\}\}/gi,
    /\{\{\s*Contact\.LocalMileActivationLink\s*\}\}/gi,
    /\{\{\s*Contact\.LocalMilePlusAuthLink\s*\}\}/gi,
  ], localMileActivationLink);

  content = replaceUrlPlaceholder(content, [
    /\{\{\s*acceptUrl\s*\}\}/gi,
  ], acceptUrl);

  content = replaceUrlPlaceholder(content, [
    /\{\{\s*unsubscribe_link\s*\}\}/gi,
    /\{\{\s*unsubscribe_url\s*\}\}/gi,
  ], '#');

  // Replace Text Placeholders
  content = content
    // Account Manager
    .replace(/\{\{\s*AccountManager\.Mobile\s*\}\}/gi, amMobile)
    .replace(/\{\{\s*AccountManager\.Phone\s*\}\}/gi, amMobile)
    .replace(/\{\{\s*account_manager_mobile\s*\}\}/gi, amMobile)
    .replace(/\{\{\s*account_manager_phone\s*\}\}/gi, amMobile)
    .replace(/\{\{\s*AM\.Mobile\s*\}\}/gi, amMobile)
    .replace(/\{\{\s*AMMobile\s*\}\}/gi, amMobile)
    .replace(/\{\{\s*AccountManager\.Name\s*\}\}/gi, amName)
    .replace(/\{\{\s*account_manager_name\s*\}\}/gi, amName)
    .replace(/\{\{\s*AM\.Name\s*\}\}/gi, amName)
    .replace(/\{\{\s*AMName\s*\}\}/gi, amName)
    .replace(/\{\{\s*AccountManager\.Email\s*\}\}/gi, amEmail)
    .replace(/\{\{\s*account_manager_email\s*\}\}/gi, amEmail)
    .replace(/\{\{\s*AM\.Email\s*\}\}/gi, amEmail)
    .replace(/\{\{\s*AccountManager\.Calendly\s*\}\}/gi, amCalendly)
    .replace(/\{\{\s*account_manager_calendly\s*\}\}/gi, amCalendly)
    .replace(/\{\{\s*AM\.Calendly\s*\}\}/gi, amCalendly)

    // Sales Rep
    .replace(/\{\{\s*SalesRep\.Name\s*\}\}/gi, salesRepName)
    .replace(/\{\{\s*sales_rep_name\s*\}\}/gi, salesRepName)

    // Contact & Lead
    .replace(/\{\{\s*Contact\.Name\s*\}\}/gi, contactName)
    .replace(/\{\{\s*Lead\.ContactName\s*\}\}/gi, contactName)
    .replace(/\{\{\s*contact_name\s*\}\}/gi, contactName)
    .replace(/\{\{\s*contactName\s*\}\}/gi, contactName)
    .replace(/\{\{\s*lead_name\s*\}\}/gi, contactName)
    .replace(/\{\{\s*Contact\.FirstName\s*\}\}/gi, contactFirstName)
    .replace(/\{\{\s*Lead\.FirstName\s*\}\}/gi, contactFirstName)
    .replace(/\{\{\s*contact_first_name\s*\}\}/gi, contactFirstName)
    .replace(/\{\{\s*firstName\s*\}\}/gi, contactFirstName)
    .replace(/\{\{\s*first_name\s*\}\}/gi, contactFirstName)
    .replace(/\{\{\s*Company\.Name\s*\}\}/gi, companyName)
    .replace(/\{\{\s*Lead\.CompanyName\s*\}\}/gi, companyName)
    .replace(/\{\{\s*company_name\s*\}\}/gi, companyName)
    .replace(/\{\{\s*companyName\s*\}\}/gi, companyName)
    .replace(/\{\{\s*company\s*\}\}/gi, companyName)
    .replace(/\{\{\s*Lead\.Email\s*\}\}/gi, contactEmail)
    .replace(/\{\{\s*Contact\.Email\s*\}\}/gi, contactEmail)
    .replace(/\{\{\s*email\s*\}\}/gi, contactEmail)
    .replace(/\{\{\s*Lead\.Phone\s*\}\}/gi, contactPhone)
    .replace(/\{\{\s*Contact\.Phone\s*\}\}/gi, contactPhone)
    .replace(/\{\{\s*phone\s*\}\}/gi, contactPhone)
    .replace(/\{\{\s*Lead\.City\s*\}\}/gi, leadCity)
    .replace(/\{\{\s*city\s*\}\}/gi, leadCity)

    // LocalMile Security Code
    .replace(/\{\{\s*Lead\.LocalMileSecurityCode\s*\}\}/gi, localMileSecurityCode)
    .replace(/\{\{\s*Contact\.LocalMileSecurityCode\s*\}\}/gi, localMileSecurityCode)
    .replace(/\{\{\s*LocalMileSecurityCode\s*\}\}/gi, localMileSecurityCode)
    .replace(/\{\{\s*securityCode\s*\}\}/gi, localMileSecurityCode)

    // Trials Remaining
    .replace(/\{\{\s*Trials\.Remaining\s*\}\}/gi, trialsRemainingStr)
    .replace(/\{\{\s*TrialsRemaining\s*\}\}/gi, trialsRemainingStr)
    .replace(/\{\{\s*trials_remaining\s*\}\}/gi, trialsRemainingStr)

    // Franchisee
    .replace(/\{\{\s*Franchisee\.Name\s*\}\}/gi, franName)
    .replace(/\{\{\s*franchisee_name\s*\}\}/gi, franName)
    .replace(/\{\{\s*Franchisee\.MainContact\s*\}\}/gi, franMainContact)
    .replace(/\{\{\s*Franchisee\.ContactName\s*\}\}/gi, franMainContact)
    .replace(/\{\{\s*Franchisee\.Email\s*\}\}/gi, franEmail)
    .replace(/\{\{\s*franchisee_email\s*\}\}/gi, franEmail)
    .replace(/\{\{\s*Franchisee\.Mobile\s*\}\}/gi, franMobile)
    .replace(/\{\{\s*franchisee_mobile\s*\}\}/gi, franMobile)

    // Schedule & ID
    .replace(/\{\{\s*Schedule\.ServiceDate\s*\}\}/gi, scheduledServiceDate)
    .replace(/\{\{\s*Schedule\.ScheduledServiceDate\s*\}\}/gi, scheduledServiceDate)
    .replace(/\{\{\s*service_start_date\s*\}\}/gi, scheduledServiceDate)
    .replace(/\{\{\s*serviceStartDate\s*\}\}/gi, scheduledServiceDate)
    .replace(/\{\{\s*start_date\s*\}\}/gi, scheduledServiceDate)
    .replace(/\{\{\s*Prospect\.ProspectPlusID\s*\}\}/gi, prospectPlusId)
    .replace(/\{\{\s*prospect_plus_id\s*\}\}/gi, prospectPlusId)
    .replace(/\{\{\s*Receiver\.Name\s*\}\}/gi, receiverName)
    .replace(/\{\{\s*Receiver\.CompanyName\s*\}\}/gi, receiverCompanyName)
    .replace(/\{\{\s*Receiver\.Company\s*\}\}/gi, receiverCompanyName)
    .replace(/\{\{\s*Receiver\.FullAddress\s*\}\}/gi, receiverAddress)
    .replace(/\{\{\s*Ticket\.Number\s*\}\}/gi, ticketNumber)
    .replace(/\{\{\s*Tracking\.ID\s*\}\}/gi, trackingId)
    .replace(/\{\{\s*Packages\.Code\s*\}\}/gi, packageCode)
    .replace(/\{\{\s*Package\.Code\s*\}\}/gi, packageCode)
    .replace(/\{\{\s*packages\.code\s*\}\}/gi, packageCode)
    .replace(/\{\{\s*package\.code\s*\}\}/gi, packageCode)
    .replace(/\{\{\s*PackageCode\s*\}\}/gi, packageCode)
    .replace(/\{\{\s*Packages\.ConnoteNumber\s*\}\}/gi, connoteNumber)
    .replace(/\{\{\s*Package\.ConnoteNumber\s*\}\}/gi, connoteNumber)
    .replace(/\{\{\s*packages\.connote_number\s*\}\}/gi, connoteNumber)
    .replace(/\{\{\s*package\.connote_number\s*\}\}/gi, connoteNumber)
    .replace(/\{\{\s*Connote\.Number\s*\}\}/gi, connoteNumber)
    .replace(/\{\{\s*connote_number\s*\}\}/gi, connoteNumber)
    .replace(/\{\{\s*sender\.email\s*\}\}/gi, senderEmail);

  // Clean up any remaining double https:// in href attributes
  content = content.replace(/href=["']https?:\/\/https?:\/\//gi, 'href="https://');

  return content;
}
