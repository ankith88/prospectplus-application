

'use server';

import { sendPhysicalEmail } from '@/lib/email-dispatcher';
import { logEmailServer, getLeadServer, getFranchiseeEmailServer } from '@/services/firebase-server';
import { sendSms } from '@/services/sms-service';

/**
 * @fileoverview Server action to proxy LocalMile free trial requests to NetSuite.
 */

interface InitiateLocalMileTrialPayload {
	leadId: string;
	serviceType?: string;
	rate?: string | number;
	contactFirstName?: string;
	contactLastName?: string;
	contactEmail?: string;
	contactPhone?: string;
	userEmail?: string;
	userName?: string;
	accountManagerName?: string;
}

interface NetSuiteResponse {
	success: boolean;
	leadID?: string;
	message: string;
	result?: string;
	securityCode?: string;
	localMilePlusAuthLink?: string;
}

export async function initiateMPProductsTrial(payload: InitiateLocalMileTrialPayload): Promise<NetSuiteResponse> {
	const { leadId } = payload;

	if (!leadId) {
		const errorMsg = 'Invalid payload: leadId is required.';
		console.error(`[MP Products Proxy Error] ${errorMsg}`);
		return { success: false, message: errorMsg };
	}

	const baseUrl = "https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl";
	const params = new URLSearchParams({
		script: "2305",
		deploy: "1",
		compid: "1048144",
		"ns-at": "AAEJ7tMQGhcXcO8gwnMwT4vWb1ED9y9xolecXh_KeGO0Kgg9u5c",
		leadId: leadId,
	});

	if (payload.accountManagerName) {
		params.append('accountManagerName', payload.accountManagerName);
	}

	const url = `${baseUrl}?${params.toString()}`;

	console.log(`[MP Products Proxy] Sending request for lead ${leadId} to NetSuite...`);
	console.log(`[MP Products Proxy] URL: ${url}`);

	try {
		const response = await fetch(url, { method: 'GET' });

		if (!response.ok) {
			const errorBody = await response.text();
			console.error(`[MP Products Proxy Error] Status: ${response.status}, URL: ${url}, Body: ${errorBody}`);
			return { success: false, message: `NetSuite API request failed with status ${response.status}.` };
		}

		const responseBody = await response.json();
		console.log(`[MP Products Proxy] Successfully received response for lead ${leadId}. Response:`, responseBody);

		if (responseBody.success) {
			// --- Franchisee Notification ---
			try {
				const lead = await getLeadServer(leadId);
				if (lead && lead.franchisee) {
					const franchiseeEmail = await getFranchiseeEmailServer(lead.franchisee);
					if (franchiseeEmail) {
						const franchiseeHtml = generateShipMateFranchiseeNotificationHtml(lead.companyName || 'the customer', lead);
						const subject = `New ShipMate Free Trial Started: ${lead.companyName || 'Customer'}`;
						await sendPhysicalEmail({
							to: franchiseeEmail,
							subject,
							html: franchiseeHtml,
							customFrom: payload.userEmail
						});
						await logEmailServer(leadId, {
							subject,
							bodyHtml: franchiseeHtml,
							sentAt: new Date().toISOString(),
							sender: payload.userEmail || 'info@mailplus.com.au',
							recipient: franchiseeEmail,
							status: 'delivered'
						});
						console.log(`[ShipMate Proxy] Sent franchisee notification to ${franchiseeEmail} for lead ${leadId}`);
					}
				}
			} catch (err: any) {
				console.error(`[ShipMate Proxy Error] Failed to notify franchisee:`, err);
			}
		}

		return responseBody as NetSuiteResponse;

	} catch (error: any) {
		console.error("[MP Products Proxy] A fatal error occurred during fetch:", error);
		return { success: false, message: `An unexpected error occurred: ${error.message}` };
	}
}


const SYSTEM_PLACEHOLDERS = ['system api', 'public registration page', 'system', 'unassigned', 'unknown'];

function isPlaceholderName(name?: string): boolean {
	if (!name) return true;
	return SYSTEM_PLACEHOLDERS.includes(name.trim().toLowerCase());
}

async function resolveAccountManagerDetails(
	accountManagerName?: string,
	userName?: string,
	userEmail?: string,
	leadId?: string
): Promise<{ outboundCallerName: string; aircallNumber: string }> {
	let outboundCallerName = 'MailPlus Account Manager';
	let aircallNumber = '1300 65 65 95';

	let targetAmName = !isPlaceholderName(accountManagerName) ? accountManagerName : undefined;

	// If no valid account manager name passed, fetch lead from Firestore to read accountManagerAssigned
	if (!targetAmName && leadId) {
		try {
			const lead = await getLeadServer(leadId);
			if (lead) {
				const leadAm = lead.accountManagerAssigned || (lead as any).customerSuccessAssigned || (lead as any).salesRepAssigned;
				if (!isPlaceholderName(leadAm)) {
					targetAmName = leadAm;
				}
			}
		} catch (err) {
			console.error('[LocalMile Proxy] Error fetching lead for AM resolution:', err);
		}
	}

	// Fallback to userName if not a placeholder
	if (!targetAmName && !isPlaceholderName(userName)) {
		targetAmName = userName;
	}

	try {
		const { adminApp } = await import('@/lib/firebase-admin');
		const { getFirestore } = await import('firebase-admin/firestore');
		const db = getFirestore(adminApp);

		if (targetAmName) {
			const amNameTrimmed = targetAmName.trim();
			outboundCallerName = amNameTrimmed;

			// Check if targetAmName is a direct user UID
			const docById = await db.collection('users').doc(amNameTrimmed).get();
			if (docById.exists && docById.data()) {
				const userData = docById.data()!;
				outboundCallerName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.displayName || userData.name || amNameTrimmed;
				aircallNumber = userData.aircallPhoneNumber || userData.phoneNumber || userData.mobileNumber || userData.mobile || userData.phone || aircallNumber;
				return { outboundCallerName, aircallNumber };
			}

			// Otherwise, query users collection for matching display name / full name / email / UID
			const usersSnap = await db.collection('users').get();
			const normalizedTarget = amNameTrimmed.toLowerCase();
			const matchedUserDoc = usersSnap.docs.find(doc => {
				const data = doc.data() || {};
				const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim().toLowerCase();
				const displayName = (data.displayName || '').trim().toLowerCase();
				const name = (data.name || '').trim().toLowerCase();
				const email = (data.email || '').trim().toLowerCase();
				return fullName === normalizedTarget || displayName === normalizedTarget || name === normalizedTarget || email === normalizedTarget || doc.id.toLowerCase() === normalizedTarget;
			});

			if (matchedUserDoc) {
				const userData = matchedUserDoc.data();
				outboundCallerName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.displayName || userData.name || amNameTrimmed;
				aircallNumber = userData.aircallPhoneNumber || userData.phoneNumber || userData.mobileNumber || userData.mobile || userData.phone || aircallNumber;
				return { outboundCallerName, aircallNumber };
			}
		}

		// Secondary fallback: lookup by userEmail if present and not a system email
		if (userEmail && !userEmail.toLowerCase().includes('system')) {
			const usersSnap = await db.collection('users').where('email', '==', userEmail).limit(1).get();
			if (!usersSnap.empty) {
				const userData = usersSnap.docs[0].data();
				outboundCallerName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.displayName || userData.name || 'MailPlus Account Manager';
				aircallNumber = userData.aircallPhoneNumber || userData.phoneNumber || userData.mobileNumber || userData.mobile || userData.phone || aircallNumber;
				return { outboundCallerName, aircallNumber };
			}
		}
	} catch (err) {
		console.error('[LocalMile Proxy] Error resolving account manager details:', err);
	}

	return { outboundCallerName, aircallNumber };
}


export async function initiateLocalMileTrial(payload: InitiateLocalMileTrialPayload): Promise<NetSuiteResponse> {
	const { leadId, serviceType, rate, contactFirstName, contactLastName, contactEmail, contactPhone, userEmail, userName, accountManagerName } = payload;

	if (!leadId) {
		const errorMsg = 'Invalid payload: leadId is required.';
		console.error(`[LocalMile Proxy Error] ${errorMsg}`);
		return { success: false, message: errorMsg };
	}

	const baseUrl = "https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl";
	const payloadParams: Record<string, string> = {
		script: "2645",
		deploy: "1",
		compid: "1048144",
		"ns-at": "AAEJ7tMQnTpHlatbGqddTAKUm9-fzPWGQ8LslucF9a1gs3nU_5E",
		leadId: leadId,
	};
	if (serviceType) payloadParams.serviceType = serviceType;
	if (rate !== undefined) payloadParams.rate = String(rate);
	if (contactFirstName) payloadParams.contactFirstName = contactFirstName;
	if (contactLastName) payloadParams.contactLastName = contactLastName;
	if (contactEmail) payloadParams.contactEmail = contactEmail;
	if (contactPhone) payloadParams.contactPhone = contactPhone;
	if (accountManagerName) payloadParams.accountManagerName = accountManagerName;

	const params = new URLSearchParams(payloadParams);

	const url = `${baseUrl}?${params.toString()}`;

	console.log(`[LocalMile Proxy] Sending request for lead ${leadId} to NetSuite...`);
	console.log(`[LocalMile Proxy] URL: ${url}`);

	try {
		const response = await fetch(url, { method: 'GET' });

		if (!response.ok) {
			if (response.status === 500) {
				console.error(`[LocalMile Proxy Error] Status: 500, URL: ${url}`);
				return { success: false, message: "Did not Sync with NetSuite" };
			}
			const errorBody = await response.text();
			console.error(`[LocalMile Proxy Error] Status: ${response.status}, URL: ${url}, Body: ${errorBody}`);
			return { success: false, message: `NetSuite API request failed with status ${response.status}.` };
		}

		const responseBody = await response.json();
		console.log(`[LocalMile Proxy] Successfully received response for lead ${leadId}. Response:`, responseBody);

		if (responseBody.success && responseBody.localMilePlusAuthLink && responseBody.securityCode && contactEmail) {
			// Fetch account manager's details using lead document and user lookup helper
			const { outboundCallerName, aircallNumber } = await resolveAccountManagerDetails(
				payload.accountManagerName,
				payload.userName,
				payload.userEmail,
				payload.leadId
			);

			const html = generateLocalMileEmailHtml(
				contactFirstName || 'Valued Customer',
				responseBody.securityCode,
				responseBody.localMilePlusAuthLink,
				outboundCallerName,
				aircallNumber
			);
			await sendPhysicalEmail({
				to: contactEmail,
				subject: "Your LocalMile Access",
				html,
				customFrom: "localmile@mailplus.com.au"
			});
			await logEmailServer(payload.leadId, {
				subject: "Your LocalMile Access",
				bodyHtml: html,
				sentAt: new Date().toISOString(),
				sender: 'localmile@mailplus.com.au',
				recipient: contactEmail,
				status: 'delivered'
			});

			if (contactPhone) {
				const smsText = `Hi ${contactFirstName || 'Customer'}, you have been granted access to LocalMile. Please use Security Code: ${responseBody.securityCode} to authenticate your account at: ${responseBody.localMilePlusAuthLink}`;
				await sendSms(contactPhone, smsText);
			}

			// --- Franchisee Notification ---
			try {
				const lead = await getLeadServer(payload.leadId);
				if (lead && lead.franchisee) {
					const franchiseeEmail = await getFranchiseeEmailServer(lead.franchisee);
					if (franchiseeEmail) {
						const franchiseeHtml = generateFranchiseeNotificationHtml(lead.companyName || 'the customer', serviceType, rate, lead);
						const subject = `New LocalMile Free Trial Started: ${lead.companyName || 'Customer'}`;
						await sendPhysicalEmail({
							to: franchiseeEmail,
							subject,
							html: franchiseeHtml,
							customFrom: userEmail
						});
						await logEmailServer(payload.leadId, {
							subject,
							bodyHtml: franchiseeHtml,
							sentAt: new Date().toISOString(),
							sender: userEmail || 'info@mailplus.com.au',
							recipient: franchiseeEmail,
							status: 'delivered'
						});
						console.log(`[LocalMile Proxy] Sent franchisee notification to ${franchiseeEmail} for lead ${payload.leadId}`);
					}
				}
			} catch (err: any) {
				console.error(`[LocalMile Proxy Error] Failed to notify franchisee:`, err);
			}
			// --------------------------------
		}

		return responseBody as NetSuiteResponse;

	} catch (error: any) {
		console.error("[LocalMile Proxy] A fatal error occurred during fetch:", error);
		return { success: false, message: `An unexpected error occurred: ${error.message}` };
	}
}

export async function resendLocalMileEmail(payload: {
	contactEmail: string;
	contactFirstName: string;
	securityCode: string;
	localMilePlusAuthLink: string;
	userEmail?: string;
	leadId?: string;
	contactPhone?: string;
	userName?: string;
	accountManagerName?: string;
}): Promise<{ success: boolean; message?: string }> {
	const { contactEmail, contactFirstName, securityCode, localMilePlusAuthLink, userEmail, contactPhone, userName, accountManagerName } = payload;

	if (!contactEmail || !securityCode || !localMilePlusAuthLink) {
		return { success: false, message: "Missing required fields to resend email." };
	}

	// Fetch account manager's details using lead document and user lookup helper
	const { outboundCallerName, aircallNumber } = await resolveAccountManagerDetails(
		accountManagerName,
		userName,
		userEmail,
		payload.leadId
	);

	const html = generateLocalMileEmailHtml(
		contactFirstName || 'Valued Customer',
		securityCode,
		localMilePlusAuthLink,
		outboundCallerName,
		aircallNumber
	);

	try {
		await sendPhysicalEmail({
			to: contactEmail,
			subject: "Your LocalMile Access",
			html,
			customFrom: "localmile@mailplus.com.au"
		});
		if (payload.leadId) {
			await logEmailServer(payload.leadId, {
				subject: "Your LocalMile Access",
				bodyHtml: html,
				sentAt: new Date().toISOString(),
				sender: 'localmile@mailplus.com.au',
				recipient: contactEmail,
				status: 'delivered'
			});
		}

		if (contactPhone) {
			const smsText = `Hi ${contactFirstName || 'Customer'}, you have been granted access to LocalMile. Please use Security Code: ${securityCode} to authenticate your account at: ${localMilePlusAuthLink}`;
			await sendSms(contactPhone, smsText);
		}

		return { success: true };
	} catch (error: any) {
		console.error("[LocalMile Proxy] Error resending email:", error);
		return { success: false, message: `An unexpected error occurred: ${error.message}` };
	}
}

export async function recreateLocalMileCode(payload: { email: string }): Promise<{ success: boolean; securityCode?: string; message?: string }> {
	const { email } = payload;
	if (!email) {
		return { success: false, message: "Missing required field: email." };
	}

	const url = "https://localmile.plus/api/v1/accounts/recreate-code";

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-API-KEY': 'f7d8c2e1b0a943ef8215d6c7b8a90123fe456789abcd0123456789abcdef0123'
			},
			body: JSON.stringify({ email })
		});

		if (!response.ok) {
			const errorBody = await response.text();
			console.error(`[LocalMile Proxy Error] Code recreation failed: ${response.status} ${errorBody}`);
			return { success: false, message: `Failed to recreate code. Status: ${response.status}` };
		}

		const data = await response.json();
		if (data.success && data.data?.securityCode) {
			return { success: true, securityCode: data.data.securityCode };
		} else {
			return { success: false, message: data.message || "Failed to recreate code." };
		}
	} catch (error: any) {
		console.error("[LocalMile Proxy] Fatal error during code recreation:", error);
		return { success: false, message: `An unexpected error occurred: ${error.message}` };
	}
}

function generateLocalMileEmailHtml(
	contactFirstName: string,
	securityCode: string,
	localMilePlusAuthLink: string,
	outboundCallerName: string = 'MailPlus Outbound Team',
	aircallNumber: string = '1300 65 65 95'
): string {
	const firstName = contactFirstName ? contactFirstName.trim().split(/\s+/)[0] : 'Valued Customer';
	return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<title>Your LocalMile Access</title>
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
<style>
	body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
	table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
	table { border-collapse: collapse !important; }
	body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f4f7f8; }
	a { text-decoration: none; }

	@media screen and (max-width: 620px) {
		.container { width: 100% !important; }
		.px { padding-left: 20px !important; padding-right: 20px !important; }
		.code { font-size: 34px !important; letter-spacing: 5px !important; }
		.h2 { font-size: 22px !important; line-height: 28px !important; }
		.btn a { display: block !important; }
	}
</style>
</head>
<body style="margin:0; padding:0; background-color:#f4f7f8;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f7f8; padding: 20px 0;">
<tr>
<td align="center" style="padding: 20px 12px;">

	<!-- ===== Main container ===== -->
	<table role="presentation" class="container" align="center" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">

	<!-- ===== 1. ACTIVATION BLOCK ===== -->
	<tr>
	<td bgcolor="#ffffff" class="px" style="padding: 45px 35px 10px 35px; border-radius: 12px 12px 0 0;">
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
		<tr>
		<td style="font-family: Arial, Helvetica, sans-serif; font-size: 22px; font-weight: bold; color: #095c7b; padding-bottom: 12px;">
			Hi ${firstName},
		</td>
		</tr>
		<tr>
		<td style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 24px; color: #556068; padding-bottom: 12px;">
			Welcome aboard &#8212; as we discussed on the call, your <strong style="color:#333333;">five free collections</strong> are ready and waiting. Below is your access to <strong style="color:#333333;">LocalMile</strong>, the free booking platform where you&#8217;ll manage them.
		</td>
		</tr>
		<tr>
		<td style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 20px; color: #718096; padding-bottom: 25px;">
			Activating takes about two minutes: enter your security code, set a password, and you&#8217;re in. LocalMile will look a little different to the MailPlus site &#8212; same team, it&#8217;s just where the bookings live.
		</td>
		</tr>
		</table>

		<!-- Security code panel -->
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
		<tr>
		<td bgcolor="#f8fafb" style="border-left: 4px solid #EAF044; padding: 28px 20px; text-align: center;">
			<div style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: bold; color: #095c7b; text-transform: uppercase; letter-spacing: 2px; padding-bottom: 10px;">Your Security Code</div>
			<div class="code" style="font-family: Arial, Helvetica, sans-serif; font-size: 40px; font-weight: bold; color: #095c7b; letter-spacing: 8px;">${securityCode}</div>
			<div style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #718096; padding-top: 10px;">Enter this code on the activation page. This link and code are unique to you &#8212; please don&#8217;t forward this email.</div>
		</td>
		</tr>
		</table>

		<!-- Bulletproof button -->
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
		<tr>
		<td align="center" class="btn" style="padding: 32px 0 8px 0;">
			<table role="presentation" cellpadding="0" cellspacing="0" border="0">
			<tr>
			<td bgcolor="#EAF044" style="mso-padding-alt: 16px 40px;">
				<a href="${localMilePlusAuthLink}" target="_blank" style="display: inline-block; padding: 16px 40px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; color: #095c7b; text-transform: uppercase; letter-spacing: 1px; text-decoration: none;">Activate my account &#8594;</a>
			</td>
			</tr>
			</table>
		</td>
		</tr>
		<tr>
		<td align="center" style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 19px; color: #718096; padding: 15px 10px 40px 10px;">
			Or copy and paste this link into your browser:<br>
			<a href="${localMilePlusAuthLink}" target="_blank" style="color: #095c7b; text-decoration: underline; word-break: break-all;">${localMilePlusAuthLink}</a>
		</td>
		</tr>
		</table>
	</td>
	</tr>

	<!-- ===== 2. WHAT HAPPENS NEXT (onboarding) ===== -->
	<tr>
	<td bgcolor="#f8fafb" class="px" style="padding: 45px 35px 40px 35px; border-top: 1px solid #e1e8ed;">
		<div style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: bold; color: #095c7b; text-transform: uppercase; letter-spacing: 2px; padding-bottom: 8px;">What happens next</div>
		<div class="h2" style="font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: bold; color: #333333; line-height: 32px; padding-bottom: 24px;">From code to collection in <span style="background-color: #EAF044; padding: 0 6px;">three steps.</span></div>
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
		<tr>
			<td width="46" valign="top" style="padding-bottom: 20px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#EAF044" width="34" height="34" align="center" style="font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: bold; color: #095c7b;">1</td></tr></table></td>
			<td valign="top" style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 22px; color: #556068; padding-bottom: 20px;"><strong style="color:#333333;">Activate your account.</strong> Click the button above, check your details, enter your code and set a password. Your business info is already filled in.</td>
		</tr>
		<tr>
			<td width="46" valign="top" style="padding-bottom: 20px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#EAF044" width="34" height="34" align="center" style="font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: bold; color: #095c7b;">2</td></tr></table></td>
			<td valign="top" style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 22px; color: #556068; padding-bottom: 20px;"><strong style="color:#333333;">Book your first collection.</strong> Hit &#8220;Book New Job&#8221; on your dashboard &#8212; your pickup address and Post Office drop-off are already set. Book before 12pm for same-day collection.</td>
		</tr>
		<tr>
			<td width="46" valign="top"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#EAF044" width="34" height="34" align="center" style="font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: bold; color: #095c7b;">3</td></tr></table></td>
			<td valign="top" style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 22px; color: #556068;"><strong style="color:#333333;">Meet your local driver.</strong> Your MailPlus owner-operator collects your parcels and lodges them at the Post Office &#8212; no queue, no trip. Then just use your remaining collections whenever suits.</td>
		</tr>
		</table>
	</td>
	</tr>

	<!-- ===== 3. THE OFFER, AS AGREED ===== -->
	<tr>
	<td bgcolor="#ffffff" class="px" style="padding: 40px 35px 35px 35px;">
		<div class="h2" style="font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: bold; color: #333333; line-height: 32px; padding-bottom: 20px;">The offer, exactly as we agreed.</div>
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
		<tr>
			<td width="32" valign="top" style="padding-bottom: 14px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#EAF044" width="22" height="22" align="center" style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; font-weight: bold; color: #095c7b;">&#10003;</td></tr></table></td>
			<td style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 22px; color: #333333; padding-bottom: 14px;"><strong>5 collections, on us</strong> &#8212; no credit card, no invoice, no payment details</td>
		</tr>
		<tr>
			<td width="32" valign="top" style="padding-bottom: 14px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#EAF044" width="22" height="22" align="center" style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; font-weight: bold; color: #095c7b;">&#10003;</td></tr></table></td>
			<td style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 22px; color: #333333; padding-bottom: 14px;"><strong>No contract, nothing to cancel</strong> &#8212; use your five and decide</td>
		</tr>
		<tr>
			<td width="32" valign="top"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#EAF044" width="22" height="22" align="center" style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; font-weight: bold; color: #095c7b;">&#10003;</td></tr></table></td>
			<td style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 22px; color: #333333;"><strong>After your five</strong> &#8212; book ad hoc at $15 + GST per collection, or have your Account Manager tailor rates for a regular service. No pressure either way.</td>
		</tr>
		</table>
	</td>
	</tr>

	<!-- ===== 4. FINAL CTA ===== -->
	<tr>
	<td bgcolor="#ffffff" class="px" style="padding: 0 35px 45px 35px;" align="center">
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
		<tr>
		<td align="center" style="border-top: 1px solid #e1e8ed; padding-top: 30px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 24px; color: #556068; padding-bottom: 22px;">
			<strong style="color:#333333;">Two minutes, and the Post Office run is history.</strong>
		</td>
		</tr>
		<tr>
		<td align="center" class="btn">
			<table role="presentation" cellpadding="0" cellspacing="0" border="0">
			<tr>
			<td bgcolor="#EAF044" style="mso-padding-alt: 16px 40px;">
				<a href="${localMilePlusAuthLink}" target="_blank" style="display: inline-block; padding: 16px 40px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; color: #095c7b; text-transform: uppercase; letter-spacing: 1px; text-decoration: none;">Activate my account &#8594;</a>
			</td>
			</tr>
			</table>
		</td>
		</tr>
		<tr>
		<td align="center" style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 20px; color: #718096; padding-top: 16px;">
			Your security code: <strong style="font-size: 16px; color: #095c7b; letter-spacing: 3px;">${securityCode}</strong>
		</td>
		</tr>
		</table>
	</td>
	</tr>

	<!-- Personal sign-off -->
	<tr>
	<td bgcolor="#ffffff" class="px" style="padding: 0 35px 45px 35px;">
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
		<tr>
		<td bgcolor="#f8fafb" style="border-left: 4px solid #EAF044; padding: 22px 24px;">
			<div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 22px; color: #556068; padding-bottom: 12px;">
				Stuck on any step, or just want to talk it through? Skip the hold music &#8212; call me directly.
			</div>
			<div style="font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: bold; color: #333333; padding-bottom: 2px;">${outboundCallerName}</div>
			<div style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #718096; padding-bottom: 8px;">MailPlus</div>
			<div style="font-family: Arial, Helvetica, sans-serif; font-size: 15px;"><a href="tel:${aircallNumber}" style="color: #095c7b; font-weight: bold; text-decoration: none;">${aircallNumber}</a></div>
		</td>
		</tr>
		</table>
	</td>
	</tr>

	<!-- Navy brand banner -->
	<tr>
	<td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
		<img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" width="135" style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;" />
	</td>
	</tr>

	<!-- Footer (Complies with brand and legal footer rules, uses 'Inter' font family layout) -->
	<tr>
	<td align="center" style="background-color: #f8fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #edf2f7; font-size: 12px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5; border-radius: 0 0 12px 12px;">
		<p style="margin: 0 0 6px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
			<strong style="font-weight: 700; color: #4a5568;">MailPlus</strong> | Business logistics, made simple.
		</p>
		<p style="margin: 0 0 15px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
			Powered by MailPlus Australia
		</p>
		<p style="margin: 0; font-size: 11px; color: #a0aec0; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
			&copy; 2026 MailPlus. All rights reserved. <br />
			If you no longer wish to receive marketing communications, you can&nbsp;
			<a href="{{unsubscribe_link}}" style="color: #095c7b; text-decoration: underline;">Unsubscribe here</a>
		</p>
	</td>
	</tr>

	</table>
	<!-- ===== /Main container ===== -->

</td>
</tr>
</table>

</body>
</html>`;
}

function generateFranchiseeNotificationHtml(companyName: string, serviceType?: string, rate?: string | number, lead?: any): string {
	const frequency = serviceType === 'Recurring' ? 'Recurring (Daily)' : 'Adhoc (On Demand)';
	const formattedRate = rate !== undefined ? `$${parseFloat(String(rate)).toFixed(2)}` : '$15.00';
	const addressParts = lead ? [lead.address1, lead.street, lead.city, lead.state, lead.zip].filter(Boolean) : [];
	const addressHtml = addressParts.length > 0 ? addressParts.join(', ') : 'N/A';

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MailPlus - New LocalMile Free Trial Started</title>
  <!-- Modern and geometric Inter font family from Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&amp;display=swap" rel="stylesheet" />
  <style>
    body, html {
      margin: 0;
      padding: 0;
      width: 100% !important;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    img {
      border: 0;
      outline: none;
      text-decoration: none;
      -ms-interpolation-mode: bicubic;
    }
    @media screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 8px !important;
      }
      .content-cell {
        padding: 30px 20px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100% !important; background-color: #f4f7f8; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f7f8; padding: 20px 0; width: 100%;">
    <tr>
      <td align="center">
        <!-- Inner container table -->
        <table class="email-container" align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 24px rgba(9, 92, 123, 0.06);">
          
          <!-- 1. Body Text & Content Row -->
          <tr>
            <td class="content-cell" style="padding: 45px 35px 35px 35px; color: #2d3748; font-size: 15px; line-height: 1.6; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
              
              <div class="greeting" style="font-size: 22px; color: #095c7b; font-weight: 700; margin-bottom: 12px; letter-spacing: -0.5px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Hi Team,
              </div>
              
              <p style="margin: 0 0 25px 0; font-size: 15px; color: #556068; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                There is a free trial starting for <strong>${companyName}</strong>.
              </p>
              
              <!-- Highlights section using table-based layout and inline CSS -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafb; border-radius: 12px; border-left: 4px solid #EAF044; margin: 25px 0; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                <tr>
                  <td style="padding: 25px 20px;">
                    <div style="font-weight: 600; color: #095c7b; margin-bottom: 15px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">
                      Trial Details
                    </div>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding: 5px 0; font-size: 14px; text-align: left; vertical-align: top;">
                          <span style="font-weight: 600; color: #556068; display: inline-block; width: 140px;">Service:</span>
                          <span style="color: #333333;">LocalMile - Outgoing Mail Lodgement (PMPO)</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; font-size: 14px; text-align: left; vertical-align: top;">
                          <span style="font-weight: 600; color: #556068; display: inline-block; width: 140px;">Address:</span>
                          <span style="color: #333333;">${addressHtml}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; font-size: 14px; text-align: left; vertical-align: top;">
                          <span style="font-weight: 600; color: #556068; display: inline-block; width: 140px;">Trial Period:</span>
                          <span style="color: #333333;">5 free services</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; font-size: 14px; text-align: left; vertical-align: top;">
                          <span style="font-weight: 600; color: #556068; display: inline-block; width: 140px;">Frequency:</span>
                          <span style="color: #333333;">${frequency}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; font-size: 14px; text-align: left; vertical-align: top;">
                          <span style="font-weight: 600; color: #556068; display: inline-block; width: 140px;">Post-Trial Rate:</span>
                          <span style="color: #333333;"><strong>${formattedRate} per service</strong></span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- 2. Relocated Navy Banner containing MailPlus Brand Logo Image -->
          <tr>
            <td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
              <img
                src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD"
                alt="MailPlus Logo"
                width="135"
                style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;"
              />
            </td>
          </tr>

          <!-- 3. Legal and Brand Footer -->
          <tr>
            <td align="center" style="background-color: #f8fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #edf2f7; font-size: 12px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
              <p style="margin: 0 0 6px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                <strong style="font-weight: 700; color: #4a5568;">MailPlus</strong> | Business logistics, made simple.
              </p>
              <p style="margin: 0 0 15px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Powered by MailPlus Australia
              </p>
              <p style="margin: 0; font-size: 11px; color: #a0aec0; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
                &copy; ${new Date().getFullYear()} MailPlus. All rights reserved. <br />
                You are receiving this system communication because a customer in your territory has initiated a LocalMile free trial.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateShipMateFranchiseeNotificationHtml(companyName: string, lead?: any): string {
	const addressParts = lead ? [lead.address1, lead.street, lead.city, lead.state, lead.zip].filter(Boolean) : [];
	const addressHtml = addressParts.length > 0 ? addressParts.join(', ') : 'N/A';

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MailPlus - New ShipMate Free Trial Started</title>
  <!-- Modern and geometric Inter font family from Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&amp;display=swap" rel="stylesheet" />
  <style>
    body, html {
      margin: 0;
      padding: 0;
      width: 100% !important;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    img {
      border: 0;
      outline: none;
      text-decoration: none;
      -ms-interpolation-mode: bicubic;
    }
    @media screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 8px !important;
      }
      .content-cell {
        padding: 30px 20px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100% !important; background-color: #f4f7f8; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f7f8; padding: 20px 0; width: 100%;">
    <tr>
      <td align="center">
        <!-- Inner container table -->
        <table class="email-container" align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 24px rgba(9, 92, 123, 0.06);">
          
          <!-- 1. Body Text & Content Row -->
          <tr>
            <td class="content-cell" style="padding: 45px 35px 35px 35px; color: #2d3748; font-size: 15px; line-height: 1.6; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
              
              <div class="greeting" style="font-size: 22px; color: #095c7b; font-weight: 700; margin-bottom: 12px; letter-spacing: -0.5px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Hi Team,
              </div>
              
              <p style="margin: 0 0 25px 0; font-size: 15px; color: #556068; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                There is a free trial starting for <strong>${companyName}</strong>.
              </p>
              
              <!-- Highlights section using table-based layout and inline CSS -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafb; border-radius: 12px; border-left: 4px solid #EAF044; margin: 25px 0; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                <tr>
                  <td style="padding: 25px 20px;">
                    <div style="font-weight: 600; color: #095c7b; margin-bottom: 15px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">
                      Trial Details
                    </div>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding: 5px 0; font-size: 14px; text-align: left; vertical-align: top;">
                          <span style="font-weight: 600; color: #556068; display: inline-block; width: 140px;">Service:</span>
                          <span style="color: #333333;">ShipMate - Freight and parcel shipping platform</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; font-size: 14px; text-align: left; vertical-align: top;">
                          <span style="font-weight: 600; color: #556068; display: inline-block; width: 140px;">Address:</span>
                          <span style="color: #333333;">${addressHtml}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; font-size: 14px; text-align: left; vertical-align: top;">
                          <span style="font-weight: 600; color: #556068; display: inline-block; width: 140px;">Trial Period:</span>
                          <span style="color: #333333;">Free Trial</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; font-size: 14px; text-align: left; vertical-align: top;">
                          <span style="font-weight: 600; color: #556068; display: inline-block; width: 140px;">Frequency:</span>
                          <span style="color: #333333;">Adhoc (On Demand)</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; font-size: 14px; text-align: left; vertical-align: top;">
                          <span style="font-weight: 600; color: #556068; display: inline-block; width: 140px;">Post-Trial Rate:</span>
                          <span style="color: #333333;">Standard carrier/freight rates apply (no platform fees)</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- 2. Relocated Navy Banner containing MailPlus Brand Logo Image -->
          <tr>
            <td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
              <img
                src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD"
                alt="MailPlus Logo"
                width="135"
                style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;"
              />
            </td>
          </tr>

          <!-- 3. Legal and Brand Footer -->
          <tr>
            <td align="center" style="background-color: #f8fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #edf2f7; font-size: 12px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
              <p style="margin: 0 0 6px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                <strong style="font-weight: 700; color: #4a5568;">MailPlus</strong> | Business logistics, made simple.
              </p>
              <p style="margin: 0 0 15px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Powered by MailPlus Australia
              </p>
              <p style="margin: 0; font-size: 11px; color: #a0aec0; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
                &copy; ${new Date().getFullYear()} MailPlus. All rights reserved. <br />
                You are receiving this system communication because a customer in your territory has initiated a ShipMate free trial.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

