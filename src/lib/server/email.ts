import { env } from '$env/dynamic/private';

interface SendEmailOptions {
	to: string;
	toName?: string;
	subject: string;
	htmlContent: string;
	textContent?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
	const apiKey = env.BREVO_API_KEY;
	if (!apiKey) {
		console.warn('[email] BREVO_API_KEY not set, skipping email send');
		return;
	}

	const senderEmail = env.BREVO_SENDER_EMAIL || 'noreply@example.com';
	const senderName = env.BREVO_SENDER_NAME || 'Equipe';

	const response = await fetch('https://api.brevo.com/v3/smtp/email', {
		method: 'POST',
		headers: {
			accept: 'application/json',
			'api-key': apiKey,
			'content-type': 'application/json'
		},
		body: JSON.stringify({
			sender: { name: senderName, email: senderEmail },
			to: [{ email: options.to, ...(options.toName && { name: options.toName }) }],
			subject: options.subject,
			htmlContent: options.htmlContent,
			...(options.textContent && { textContent: options.textContent })
		})
	});

	if (!response.ok) {
		const body = await response.text();
		console.error(`[email] Brevo API error (${response.status}):`, body);
	}
}

function emailLayout(content: string): string {
	return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:IBM Plex Sans,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:4px;">
	<tr><td style="padding:32px 32px 0;text-align:center;">
		<h1 style="margin:0;font-size:24px;font-weight:600;color:#161616;">Equipe</h1>
	</td></tr>
	<tr><td style="padding:24px 32px 32px;">
		${content}
	</td></tr>
	<tr><td style="padding:16px 32px;border-top:1px solid #e0e0e0;text-align:center;">
		<p style="margin:0;font-size:12px;color:#8d8d8d;">Cet email a été envoyé automatiquement par Equipe.</p>
	</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function verificationEmailHtml(url: string, userName?: string): string {
	return emailLayout(`
		<p style="margin:0 0 16px;font-size:16px;color:#161616;">
			Bonjour${userName ? ` ${userName}` : ''},
		</p>
		<p style="margin:0 0 24px;font-size:14px;color:#525252;">
			Merci de vous être inscrit sur Equipe. Veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous.
		</p>
		<table width="100%" cellpadding="0" cellspacing="0">
		<tr><td align="center" style="padding:8px 0 24px;">
			<a href="${url}" style="display:inline-block;padding:12px 24px;background:#0f62fe;color:#ffffff;text-decoration:none;border-radius:4px;font-size:14px;font-weight:500;">
				Vérifier mon email
			</a>
		</td></tr>
		</table>
		<p style="margin:0;font-size:12px;color:#8d8d8d;">
			Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.
		</p>
	`);
}

export function invitationEmailHtml(
	teamName: string,
	inviterName: string,
	signupUrl: string
): string {
	return emailLayout(`
		<p style="margin:0 0 16px;font-size:16px;color:#161616;">
			Bonjour,
		</p>
		<p style="margin:0 0 24px;font-size:14px;color:#525252;">
			<strong>${inviterName}</strong> vous invite à rejoindre l'équipe <strong>${teamName}</strong> sur Equipe. Créez votre compte pour commencer à collaborer.
		</p>
		<table width="100%" cellpadding="0" cellspacing="0">
		<tr><td align="center" style="padding:8px 0 24px;">
			<a href="${signupUrl}" style="display:inline-block;padding:12px 24px;background:#0f62fe;color:#ffffff;text-decoration:none;border-radius:4px;font-size:14px;font-weight:500;">
				Créer mon compte
			</a>
		</td></tr>
		</table>
		<p style="margin:0;font-size:12px;color:#8d8d8d;">
			Si vous ne souhaitez pas rejoindre cette équipe, vous pouvez ignorer cet email.
		</p>
	`);
}

export function resetPasswordEmailHtml(url: string, userName?: string): string {
	return emailLayout(`
		<p style="margin:0 0 16px;font-size:16px;color:#161616;">
			Bonjour${userName ? ` ${userName}` : ''},
		</p>
		<p style="margin:0 0 24px;font-size:14px;color:#525252;">
			Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.
		</p>
		<table width="100%" cellpadding="0" cellspacing="0">
		<tr><td align="center" style="padding:8px 0 24px;">
			<a href="${url}" style="display:inline-block;padding:12px 24px;background:#0f62fe;color:#ffffff;text-decoration:none;border-radius:4px;font-size:14px;font-weight:500;">
				Réinitialiser mon mot de passe
			</a>
		</td></tr>
		</table>
		<p style="margin:0;font-size:12px;color:#8d8d8d;">
			Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.
		</p>
	`);
}
