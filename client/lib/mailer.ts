import nodemailer from "nodemailer";
import { content } from "@/lib/content";

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT ?? 587);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.MAIL_FROM ?? user;

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;
  if (!host || !user || !pass) {
    throw new Error("Missing SMTP_HOST / SMTP_USER / SMTP_PASS env vars");
  }
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
}

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function send({ to, subject, html, text }: SendArgs) {
  const t = getTransporter();
  await t.sendMail({ from, to, subject, html, text });
}

const wrap = (inner: string) => `
<!doctype html>
<html><body style="margin:0;padding:0;background:#1A1A1A;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#F5F5F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1A1A1A;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#222;border:1px solid #333;border-radius:12px;padding:32px;">
        <tr><td style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.25em;color:#D4A843;padding-bottom:24px;">CODE.IN · FUTURE ENGINEERS CONCLAVE</td></tr>
        ${inner}
        <tr><td style="padding-top:32px;border-top:1px solid #333;font-size:12px;color:#8a8a85;">${content.footer.legal}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

export async function sendInviteEmail(args: { to: string; name?: string; inviteUrl: string }) {
  const greeting = args.name ? `Dear ${args.name},` : "Hello,";
  const html = wrap(`
    <tr><td style="font-size:24px;font-weight:600;line-height:1.3;padding-bottom:16px;">You're invited to the Future Engineers Conclave.</td></tr>
    <tr><td style="font-size:15px;line-height:1.6;color:#cfcfc8;padding-bottom:24px;">${greeting}<br/><br/>An invitation-only evening for premium families navigating engineering education in the AI era. Forty families. One conversation.</td></tr>
    <tr><td style="padding-bottom:24px;"><a href="${args.inviteUrl}" style="display:inline-block;background:#D4A843;color:#1A1A1A;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;">Register your attendance</a></td></tr>
    <tr><td style="font-size:13px;color:#8a8a85;line-height:1.6;">Or paste this link into your browser:<br/><span style="color:#D4A843;word-break:break-all;">${args.inviteUrl}</span></td></tr>
  `);
  const text = `${greeting}\n\nYou're invited to the Future Engineers Conclave.\n\nRegister here: ${args.inviteUrl}\n`;
  await send({ to: args.to, subject: "Your invitation · Future Engineers Conclave", html, text });
}

export async function sendOtpEmail(args: { to: string; otp: string }) {
  const html = wrap(`
    <tr><td style="font-size:22px;font-weight:600;line-height:1.3;padding-bottom:16px;">Verify your email</td></tr>
    <tr><td style="font-size:15px;line-height:1.6;color:#cfcfc8;padding-bottom:24px;">Use this 6-digit code to complete your registration. It expires in 10 minutes.</td></tr>
    <tr><td style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:36px;letter-spacing:0.4em;font-weight:700;color:#D4A843;padding:16px 0 24px;">${args.otp}</td></tr>
    <tr><td style="font-size:13px;color:#8a8a85;line-height:1.6;">If you didn't request this, you can ignore this email.</td></tr>
  `);
  const text = `Your verification code is ${args.otp}. It expires in 10 minutes.`;
  await send({ to: args.to, subject: `Your verification code: ${args.otp}`, html, text });
}

export async function sendConfirmationEmail(args: { to: string; name?: string }) {
  const greeting = args.name ? `Dear ${args.name},` : "Hello,";
  const html = wrap(`
    <tr><td style="font-size:24px;font-weight:600;line-height:1.3;padding-bottom:16px;">Your seat is confirmed.</td></tr>
    <tr><td style="font-size:15px;line-height:1.6;color:#cfcfc8;padding-bottom:24px;">${greeting}<br/><br/>We're glad to have you at the Future Engineers Conclave.</td></tr>
    <tr><td style="font-size:14px;line-height:1.8;color:#cfcfc8;padding-bottom:24px;"><strong style="color:#D4A843;">Date:</strong> Saturday, May 23, 2026<br/><strong style="color:#D4A843;">Time:</strong> 6:00 PM – 8:30 PM<br/><strong style="color:#D4A843;">Venue:</strong> T-Hub, Hyderabad<br/><strong style="color:#D4A843;">Dress:</strong> Smart casual</td></tr>
    <tr><td style="font-size:13px;color:#8a8a85;line-height:1.6;">A reminder with directions and parking info will reach you on WhatsApp 24 hours before the event.</td></tr>
  `);
  const text = `${greeting}\n\nYour seat at the Future Engineers Conclave is confirmed.\n\nMay 23, 2026 · 6:00–8:30 PM · T-Hub, Hyderabad.`;
  await send({ to: args.to, subject: "You're confirmed · Future Engineers Conclave", html, text });
}
