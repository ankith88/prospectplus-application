

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
						const franchiseeHtml = generateShipMateFranchiseeNotificationHtml(lead.companyName || 'the customer');
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
			const html = generateLocalMileEmailHtml(
				contactFirstName || 'Valued Customer',
				responseBody.securityCode,
				responseBody.localMilePlusAuthLink
			);
			await sendPhysicalEmail({
				to: contactEmail,
				subject: "Your LocalMile Access",
				html,
				customFrom: userEmail
			});
			await logEmailServer(payload.leadId, {
				subject: "Your LocalMile Access",
				bodyHtml: html,
				sentAt: new Date().toISOString(),
				sender: userEmail || 'info@mailplus.com.au',
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
						const franchiseeHtml = generateFranchiseeNotificationHtml(lead.companyName || 'the customer', serviceType, rate);
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
}): Promise<{ success: boolean; message?: string }> {
	const { contactEmail, contactFirstName, securityCode, localMilePlusAuthLink, userEmail, contactPhone } = payload;

	if (!contactEmail || !securityCode || !localMilePlusAuthLink) {
		return { success: false, message: "Missing required fields to resend email." };
	}

	const html = generateLocalMileEmailHtml(
		contactFirstName || 'Valued Customer',
		securityCode,
		localMilePlusAuthLink
	);

	try {
		await sendPhysicalEmail({
			to: contactEmail,
			subject: "Your LocalMile Access",
			html,
			customFrom: userEmail
		});
		if (payload.leadId) {
			await logEmailServer(payload.leadId, {
				subject: "Your LocalMile Access",
				bodyHtml: html,
				sentAt: new Date().toISOString(),
				sender: userEmail || 'info@mailplus.com.au',
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

function generateLocalMileEmailHtml(contactFirstName: string, securityCode: string, localMilePlusAuthLink: string): string {
	return `<!DOCTYPE html>
<html lang="en">

<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>MailPlus - Authenticate Your Access</title>
	<!-- Modern and geometric Inter font family from Google Fonts -->
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
	
	<style>
		/* General Reset for Email Clients */
		body, html {
			margin: 0;
			padding: 0;
			width: 100% !important;
			-webkit-text-size-adjust: 100%;
			-ms-text-size-adjust: 100%;
			background-color: #f4f7f8;
		}

		/* Main container styling */
		.email-container {
			font-family: 'Inter', system-ui, -apple-system, sans-serif;
			max-width: 600px;
			margin: 40px auto;
			background-color: #ffffff;
			border-radius: 12px;
			overflow: hidden;
			box-shadow: 0 4px 20px rgba(9, 92, 123, 0.08);
			border: 1px solid #e1e8ed;
		}

		/* Main content body (No top banner) */
		.content {
			padding: 45px 35px 35px 35px;
			color: #333333;
			line-height: 1.6;
		}

		/* Greeting and core headings */
		.greeting {
			font-size: 22px;
			margin-bottom: 12px;
			color: #095c7b;
			font-weight: 700;
			letter-spacing: -0.5px;
		}

		.sub-text {
			font-size: 15px;
			color: #556068;
			margin-bottom: 25px;
		}

		/* Security Verification Code card panel */
		.action-box {
			background-color: #f8fafb;
			border-radius: 12px;
			padding: 30px 20px;
			margin: 25px 0;
			border-left: 4px solid #EAF044;
			text-align: center;
		}

		.action-box-title {
			font-weight: 600;
			color: #095c7b;
			margin-bottom: 15px;
			font-size: 13px;
			text-transform: uppercase;
			letter-spacing: 1px;
		}

		.security-code {
			font-size: 38px;
			font-weight: 800;
			color: #095c7b;
			letter-spacing: 6px;
			margin: 10px 0;
		}

		.security-hint {
			font-size: 13px;
			color: #718096;
			font-weight: 500;
			margin-top: 10px;
		}

		/* Call to action button wrapper */
		.button-container {
			text-align: center;
			margin: 35px 0 20px 0;
		}

		/* Premium modern button using brand identity colors */
		.btn-primary {
			background-color: #EAF044; /* Action Element Accent */
			color: #095c7b !important; /* Professional Blue */
			padding: 16px 36px;
			text-decoration: none;
			font-weight: 700;
			font-size: 13px;
			border-radius: 8px;
			display: inline-block;
			transition: all 0.2s ease-in-out;
			box-shadow: 0 4px 14px rgba(234, 240, 68, 0.4);
			text-transform: uppercase;
			letter-spacing: 1px;
		}

		.btn-primary:hover {
			background-color: #dbe236;
			box-shadow: 0 6px 18px rgba(234, 240, 68, 0.5);
			transform: translateY(-1px);
		}

		.raw-link-text {
			font-size: 13px;
			color: #718096;
			word-break: break-all;
			margin-top: 25px;
			text-align: center;
			line-height: 1.5;
		}

		.raw-link-text a {
			color: #095c7b;
			text-decoration: underline;
		}

		/* Relocated Navy Blue Banner (Now placed just above the footer) */
		.branding-banner {
			background-color: #095c7b;
			padding: 25px 20px;
			text-align: center;
		}

		.brand-logo {
			display: inline-block;
			vertical-align: middle;
			max-height: 42px;
			width: auto;
			border: 0;
		}

		.branding-banner span {
			color: #EAF044;
			font-weight: bold;
		}

		/* Global footer specs */
		.footer {
			background-color: #f8fafb;
			padding: 30px 20px;
			text-align: center;
			font-size: 12px;
			color: #718096;
			border-top: 1px solid #edf2f7;
		}

		.footer p {
			margin: 6px 0;
			line-height: 1.5;
		}

		/* Mobile Specific Adjustments */
		@media screen and (max-width: 600px) {
			.email-container {
				margin: 10px auto;
				border-radius: 8px;
			}
			.content {
				padding: 35px 20px;
			}
			.greeting {
				font-size: 20px;
			}
			.btn-primary {
				width: 100%;
				box-sizing: border-box;
				padding: 15px 20px;
			}
		}
	</style>
</head>

<body>
	<div class="email-container">
		
		<!-- 1. Content Area -->
		<div class="content">
			<div class="greeting">Hi ${contactFirstName},</div>
			<div class="sub-text">
				You have been granted access to <strong>LocalMile</strong>. Please authenticate your workspace access by clicking the button below and entering your security code.
			</div>

			<!-- Security credentials and code verification section -->
			<div class="action-box">
				<div class="action-box-title">Your Security Code</div>
				<div class="security-code">${securityCode}</div>
				<div class="security-hint">Please enter this code when prompted on the verification page.</div>
			</div>

			<!-- Core Action Button -->
			<div class="button-container">
				<a href="${localMilePlusAuthLink}" target="_blank" class="btn-primary">Authenticate Account</a>
			</div>

			<!-- Fallback raw activation link -->
			<div class="raw-link-text">
				Alternatively, copy and paste this link directly into your browser address bar:<br>
				<a href="${localMilePlusAuthLink}" target="_blank">${localMilePlusAuthLink}</a>
			</div>
		</div>

		<!-- 2. Relocated Navy Banner (Above Footer) -->
		<div class="branding-banner">
			<img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" class="brand-logo">
		</div>

		<!-- 3. Footer -->
		<div class="footer">
			<p><strong>MailPlus</strong> | Business logistics, made simple.</p>
			<p>Powered by MailPlus Australia</p>
			<p style="margin-top: 15px; font-size: 11px; color: #a0aec0;">
				&copy; ${new Date().getFullYear()} MailPlus. All rights reserved. <br>
				You are receiving this system communication as part of your registered account activation flow.
			</p>
		</div>
	</div>
</body>

</html>`;
}

function generateFranchiseeNotificationHtml(companyName: string, serviceType?: string, rate?: string | number): string {
	const frequency = serviceType === 'Recurring' ? 'Recurring (Daily)' : 'Adhoc (On Demand)';
	const formattedRate = rate !== undefined ? `$${parseFloat(String(rate)).toFixed(2)}` : '$15.00';

	return `<!DOCTYPE html>
<html lang="en">

<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>MailPlus - New LocalMile Free Trial Started</title>
	<!-- Modern and geometric Inter font family from Google Fonts -->
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
	
	<style>
		/* General Reset for Email Clients */
		body, html {
			margin: 0;
			padding: 0;
			width: 100% !important;
			-webkit-text-size-adjust: 100%;
			-ms-text-size-adjust: 100%;
			background-color: #f4f7f8;
		}

		/* Main container styling */
		.email-container {
			font-family: 'Inter', system-ui, -apple-system, sans-serif;
			max-width: 600px;
			margin: 40px auto;
			background-color: #ffffff;
			border-radius: 12px;
			overflow: hidden;
			box-shadow: 0 4px 20px rgba(9, 92, 123, 0.08);
			border: 1px solid #e1e8ed;
		}

		/* Main content body (No top banner) */
		.content {
			padding: 45px 35px 35px 35px;
			color: #333333;
			line-height: 1.6;
		}

		/* Greeting and core headings */
		.greeting {
			font-size: 22px;
			margin-bottom: 12px;
			color: #095c7b;
			font-weight: 700;
			letter-spacing: -0.5px;
		}

		.sub-text {
			font-size: 15px;
			color: #556068;
			margin-bottom: 25px;
		}

		/* Action box similar to the code verification section */
		.action-box {
			background-color: #f8fafb;
			border-radius: 12px;
			padding: 25px 20px;
			margin: 25px 0;
			border-left: 4px solid #EAF044;
		}

		.action-box-title {
			font-weight: 600;
			color: #095c7b;
			margin-bottom: 15px;
			font-size: 13px;
			text-transform: uppercase;
			letter-spacing: 1px;
		}

		.detail-row {
			margin-bottom: 10px;
			font-size: 14px;
			text-align: left;
		}
		.detail-label {
			font-weight: 600;
			color: #556068;
			display: inline-block;
			width: 140px;
		}
		.detail-value {
			color: #333333;
		}

		/* Relocated Navy Blue Banner (Now placed just above the footer) */
		.branding-banner {
			background-color: #095c7b;
			padding: 25px 20px;
			text-align: center;
		}

		.brand-logo {
			display: inline-block;
			vertical-align: middle;
			max-height: 42px;
			width: auto;
			border: 0;
		}

		.footer p {
			margin: 6px 0;
			line-height: 1.5;
		}

		/* Mobile Specific Adjustments */
		@media screen and (max-width: 600px) {
			.email-container {
				margin: 10px auto;
				border-radius: 8px;
			}
			.content {
				padding: 35px 20px;
			}
			.greeting {
				font-size: 20px;
			}
		}
	</style>
</head>

<body>
	<div class="email-container">
		
		<!-- 1. Content Area -->
		<div class="content">
			<div class="greeting">Hi Team,</div>
			<div class="sub-text">
				There is a free trial starting for <strong> ${companyName}</strong>.
			</div>

			<!-- Highlights section -->
			<div class="action-box">
				<div class="action-box-title">Trial Details</div>
				<div class="detail-row">
					<span class="detail-label">Service:</span>
					<span class="detail-value">LocalMile - Outgoing Mail Lodgement (PMPO)</span>
				</div>
				<div class="detail-row">
					<span class="detail-label">Trial Period:</span>
					<span class="detail-value">5 free services</span>
				</div>
				<div class="detail-row">
					<span class="detail-label">Frequency:</span>
					<span class="detail-value">${frequency}</span>
				</div>
				<div class="detail-row">
					<span class="detail-label">Post-Trial Rate:</span>
					<span class="detail-value"><strong>${formattedRate} per service</strong></span>
				</div>
			</div>
		</div>

		<!-- 2. Relocated Navy Banner (Above Footer) -->
		<div class="branding-banner">
			<img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" class="brand-logo">
		</div>

		<!-- 3. Footer -->
		<div class="footer">
			<p><strong>MailPlus</strong> | Business logistics, made simple.</p>
			<p>Powered by MailPlus Australia</p>
			<p style="margin-top: 15px; font-size: 11px; color: #a0aec0;">
				&copy; ${new Date().getFullYear()} MailPlus. All rights reserved. <br>
				You are receiving this system communication because a customer in your territory has initiated a LocalMile free trial.
			</p>
		</div>
	</div>
</body>

</html>`;
}

function generateShipMateFranchiseeNotificationHtml(companyName: string): string {
	return `<!DOCTYPE html>
<html lang="en">

<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>MailPlus - New ShipMate Free Trial Started</title>
	<!-- Modern and geometric Inter font family from Google Fonts -->
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
	
	<style>
		/* General Reset for Email Clients */
		body, html {
			margin: 0;
			padding: 0;
			width: 100% !important;
			-webkit-text-size-adjust: 100%;
			-ms-text-size-adjust: 100%;
			background-color: #f4f7f8;
		}

		/* Main container styling */
		.email-container {
			font-family: 'Inter', system-ui, -apple-system, sans-serif;
			max-width: 600px;
			margin: 40px auto;
			background-color: #ffffff;
			border-radius: 12px;
			overflow: hidden;
			box-shadow: 0 4px 20px rgba(9, 92, 123, 0.08);
			border: 1px solid #e1e8ed;
		}

		/* Main content body (No top banner) */
		.content {
			padding: 45px 35px 35px 35px;
			color: #333333;
			line-height: 1.6;
		}

		/* Greeting and core headings */
		.greeting {
			font-size: 22px;
			margin-bottom: 12px;
			color: #095c7b;
			font-weight: 700;
			letter-spacing: -0.5px;
		}

		.sub-text {
			font-size: 15px;
			color: #556068;
			margin-bottom: 25px;
		}

		/* Action box similar to the code verification section */
		.action-box {
			background-color: #f8fafb;
			border-radius: 12px;
			padding: 25px 20px;
			margin: 25px 0;
			border-left: 4px solid #EAF044;
		}

		.action-box-title {
			font-weight: 600;
			color: #095c7b;
			margin-bottom: 15px;
			font-size: 13px;
			text-transform: uppercase;
			letter-spacing: 1px;
		}

		.detail-row {
			margin-bottom: 10px;
			font-size: 14px;
			text-align: left;
		}
		.detail-label {
			font-weight: 600;
			color: #556068;
			display: inline-block;
			width: 140px;
		}
		.detail-value {
			color: #333333;
		}

		/* Relocated Navy Blue Banner (Now placed just above the footer) */
		.branding-banner {
			background-color: #095c7b;
			padding: 25px 20px;
			text-align: center;
		}

		.brand-logo {
			display: inline-block;
			vertical-align: middle;
			max-height: 42px;
			width: auto;
			border: 0;
		}

		.footer p {
			margin: 6px 0;
			line-height: 1.5;
		}

		/* Mobile Specific Adjustments */
		@media screen and (max-width: 600px) {
			.email-container {
				margin: 10px auto;
				border-radius: 8px;
			}
			.content {
				padding: 35px 20px;
			}
			.greeting {
				font-size: 20px;
			}
		}
	</style>
</head>

<body>
	<div class="email-container">
		
		<!-- 1. Content Area -->
		<div class="content">
			<div class="greeting">Hi Team,</div>
			<div class="sub-text">
				There is a free trial starting for <strong> ${companyName}</strong>.
			</div>

			<!-- Highlights section -->
			<div class="action-box">
				<div class="action-box-title">Trial Details</div>
				<div class="detail-row">
					<span class="detail-label">Service:</span>
					<span class="detail-value">ShipMate - Freight and parcel shipping platform</span>
				</div>
				<div class="detail-row">
					<span class="detail-label">Trial Period:</span>
					<span class="detail-value">Free Trial</span>
				</div>
				<div class="detail-row">
					<span class="detail-label">Frequency:</span>
					<span class="detail-value">Adhoc (On Demand)</span>
				</div>
				<div class="detail-row">
					<span class="detail-label">Post-Trial Rate:</span>
					<span class="detail-value">Standard carrier/freight rates apply (no platform fees)</span>
				</div>
			</div>
		</div>

		<!-- 2. Relocated Navy Banner (Above Footer) -->
		<div class="branding-banner">
			<img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" class="brand-logo">
		</div>

		<!-- 3. Footer -->
		<div class="footer">
			<p><strong>MailPlus</strong> | Business logistics, made simple.</p>
			<p>Powered by MailPlus Australia</p>
			<p style="margin-top: 15px; font-size: 11px; color: #a0aec0;">
				&copy; ${new Date().getFullYear()} MailPlus. All rights reserved. <br>
				You are receiving this system communication because a customer in your territory has initiated a ShipMate free trial.
			</p>
		</div>
	</div>
</body>

</html>`;
}
