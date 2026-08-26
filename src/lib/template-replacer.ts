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
    receiverName?: string;
    receiverAddress?: string;
  };
}

export function extractUserMobile(user: any): string {
  if (!user) return '';
  return (
    user.mobileNumber ||
    user.mobile ||
    user.phoneNumber ||
    user.phone ||
    user.aircallPhoneNumber ||
    user.aircallPhone ||
    user.telephone ||
    ''
  ).trim();
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
  const amMobile = am.mobile || lead.accountManagerMobile || lead.accountManagerPhone || '';
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
  const franMobile = franchisee.mobile || lead.franchiseeMobile || lead.franchiseePhone || '';

  // Prospect ID
  const prospectPlusId = lead.prospectPlusId || lead.id || '';

  // Receiver & Ticket details
  const receiverName = links.receiverName || lead.receiverDetails?.name || '';
  const receiverAddress = links.receiverAddress || lead.receiverDetails?.address || '';
  const ticketNumber = links.ticketNumber || lead.ticketNumber || '';
  const trackingId = links.trackingIdentifier || lead.trackingIdentifier || '';
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
    /\{\{Lead\.GeneralBookingLink\}\}/gi,
    /\{\{GeneralBookingLink\}\}/gi,
    /\{\{Lead\.GeneralBookingUrl\}\}/gi,
    /\{\{GeneralBookingUrl\}\}/gi,
    /\{\{Lead\.BookingLink\}\}/gi,
    /\{\{booking_link\}\}/gi,
    /\{\{booking_url\}\}/gi,
  ], generalBookingLink);

  content = replaceUrlPlaceholder(content, [
    /\{\{Lead\.ContactBookingLink\}\}/gi,
    /\{\{ContactBookingLink\}\}/gi,
    /\{\{Lead\.BookingUrlId\}\}/gi,
  ], contactBookingLink);

  content = replaceUrlPlaceholder(content, [
    /\{\{Lead\.SCFLink\}\}/gi,
    /\{\{SCFLink\}\}/gi,
    /\{\{scf_link\}\}/gi,
    /\{\{scf_url\}\}/gi,
  ], scfLink);

  content = replaceUrlPlaceholder(content, [
    /\{\{Lead\.StandingOrderFormLink\}\}/gi,
    /\{\{Lead\.SOFLink\}\}/gi,
    /\{\{Lead\.StandingOrderLink\}\}/gi,
    /\{\{StandingOrderFormLink\}\}/gi,
    /\{\{SOFLink\}\}/gi,
    /\{\{StandingOrderLink\}\}/gi,
    /\{\{sof_link\}\}/gi,
    /\{\{sof_url\}\}/gi,
    /\{\{SOF_Link\}\}/gi,
  ], sofLink);

  content = replaceUrlPlaceholder(content, [
    /\{\{Lead\.LocalMileRegistrationLink\}\}/gi,
  ], localMileLink);

  content = replaceUrlPlaceholder(content, [
    /\{\{Lead\.LocalMileActivationLink\}\}/gi,
    /\{\{LocalMileActivationLink\}\}/gi,
    /\{\{Contact\.LocalMileActivationLink\}\}/gi,
    /\{\{Contact\.LocalMilePlusAuthLink\}\}/gi,
  ], localMileActivationLink);

  content = replaceUrlPlaceholder(content, [
    /\{\{acceptUrl\}\}/gi,
  ], acceptUrl);

  content = replaceUrlPlaceholder(content, [
    /\{\{unsubscribe_link\}\}/gi,
    /\{\{unsubscribe_url\}\}/gi,
  ], '#');

  // Replace Text Placeholders
  content = content
    // Account Manager
    .replace(/\{\{AccountManager\.Mobile\}\}/gi, amMobile)
    .replace(/\{\{AccountManager\.Phone\}\}/gi, amMobile)
    .replace(/\{\{account_manager_mobile\}\}/gi, amMobile)
    .replace(/\{\{account_manager_phone\}\}/gi, amMobile)
    .replace(/\{\{AM\.Mobile\}\}/gi, amMobile)
    .replace(/\{\{AMMobile\}\}/gi, amMobile)
    .replace(/\{\{AccountManager\.Name\}\}/gi, amName)
    .replace(/\{\{account_manager_name\}\}/gi, amName)
    .replace(/\{\{AM\.Name\}\}/gi, amName)
    .replace(/\{\{AMName\}\}/gi, amName)
    .replace(/\{\{AccountManager\.Email\}\}/gi, amEmail)
    .replace(/\{\{account_manager_email\}\}/gi, amEmail)
    .replace(/\{\{AM\.Email\}\}/gi, amEmail)
    .replace(/\{\{AccountManager\.Calendly\}\}/gi, amCalendly)
    .replace(/\{\{account_manager_calendly\}\}/gi, amCalendly)
    .replace(/\{\{AM\.Calendly\}\}/gi, amCalendly)

    // Sales Rep
    .replace(/\{\{SalesRep\.Name\}\}/gi, salesRepName)
    .replace(/\{\{sales_rep_name\}\}/gi, salesRepName)

    // Contact & Lead
    .replace(/\{\{Contact\.Name\}\}/gi, contactName)
    .replace(/\{\{Lead\.ContactName\}\}/gi, contactName)
    .replace(/\{\{contact_name\}\}/gi, contactName)
    .replace(/\{\{contactName\}\}/gi, contactName)
    .replace(/\{\{lead_name\}\}/gi, contactName)
    .replace(/\{\{Contact\.FirstName\}\}/gi, contactFirstName)
    .replace(/\{\{Lead\.FirstName\}\}/gi, contactFirstName)
    .replace(/\{\{contact_first_name\}\}/gi, contactFirstName)
    .replace(/\{\{firstName\}\}/gi, contactFirstName)
    .replace(/\{\{first_name\}\}/gi, contactFirstName)
    .replace(/\{\{Company\.Name\}\}/gi, companyName)
    .replace(/\{\{Lead\.CompanyName\}\}/gi, companyName)
    .replace(/\{\{company_name\}\}/gi, companyName)
    .replace(/\{\{companyName\}\}/gi, companyName)
    .replace(/\{\{company\}\}/gi, companyName)
    .replace(/\{\{Lead\.Email\}\}/gi, contactEmail)
    .replace(/\{\{Contact\.Email\}\}/gi, contactEmail)
    .replace(/\{\{email\}\}/gi, contactEmail)
    .replace(/\{\{Lead\.Phone\}\}/gi, contactPhone)
    .replace(/\{\{Contact\.Phone\}\}/gi, contactPhone)
    .replace(/\{\{phone\}\}/gi, contactPhone)
    .replace(/\{\{Lead\.City\}\}/gi, leadCity)
    .replace(/\{\{city\}\}/gi, leadCity)

    // LocalMile Security Code
    .replace(/\{\{Lead\.LocalMileSecurityCode\}\}/gi, localMileSecurityCode)
    .replace(/\{\{Contact\.LocalMileSecurityCode\}\}/gi, localMileSecurityCode)
    .replace(/\{\{LocalMileSecurityCode\}\}/gi, localMileSecurityCode)
    .replace(/\{\{securityCode\}\}/gi, localMileSecurityCode)

    // Trials Remaining
    .replace(/\{\{Trials\.Remaining\}\}/gi, trialsRemainingStr)
    .replace(/\{\{TrialsRemaining\}\}/gi, trialsRemainingStr)
    .replace(/\{\{trials_remaining\}\}/gi, trialsRemainingStr)

    // Franchisee
    .replace(/\{\{Franchisee\.Name\}\}/gi, franName)
    .replace(/\{\{franchisee_name\}\}/gi, franName)
    .replace(/\{\{Franchisee\.MainContact\}\}/gi, franMainContact)
    .replace(/\{\{Franchisee\.ContactName\}\}/gi, franMainContact)
    .replace(/\{\{Franchisee\.Email\}\}/gi, franEmail)
    .replace(/\{\{franchisee_email\}\}/gi, franEmail)
    .replace(/\{\{Franchisee\.Mobile\}\}/gi, franMobile)
    .replace(/\{\{franchisee_mobile\}\}/gi, franMobile)

    // Schedule & ID
    .replace(/\{\{Schedule\.ServiceDate\}\}/gi, scheduledServiceDate)
    .replace(/\{\{Schedule\.ScheduledServiceDate\}\}/gi, scheduledServiceDate)
    .replace(/\{\{service_start_date\}\}/gi, scheduledServiceDate)
    .replace(/\{\{serviceStartDate\}\}/gi, scheduledServiceDate)
    .replace(/\{\{start_date\}\}/gi, scheduledServiceDate)
    .replace(/\{\{Prospect\.ProspectPlusID\}\}/gi, prospectPlusId)
    .replace(/\{\{prospect_plus_id\}\}/gi, prospectPlusId)
    .replace(/\{\{Receiver\.Name\}\}/gi, receiverName)
    .replace(/\{\{Receiver\.FullAddress\}\}/gi, receiverAddress)
    .replace(/\{\{Ticket\.Number\}\}/gi, ticketNumber)
    .replace(/\{\{Tracking\.ID\}\}/gi, trackingId)
    .replace(/\{\{sender\.email\}\}/gi, senderEmail);

  // Clean up any remaining double https:// in href attributes
  content = content.replace(/href=["']https?:\/\/https?:\/\//gi, 'href="https://');

  return content;
}
