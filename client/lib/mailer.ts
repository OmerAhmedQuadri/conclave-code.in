import { readFileSync } from "node:fs";
import { join } from "node:path";
import nodemailer from "nodemailer";
import { content } from "@/lib/content";
import { generateQrBuffer } from "@/lib/qr";

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
    // Aggressive timeouts so a flaky SMTP connection can't lock up an API
    // route. Without these, nodemailer's defaults can hang for ~5 minutes.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
    // Reuse a single connection across mails — faster than re-handshaking
    // for every send.
    pool: true,
    maxConnections: 3,
  });
  return transporter;
}

interface InlineAttachment {
  filename: string;
  content: Buffer;
  cid: string;
  contentType?: string;
}

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: InlineAttachment[];
}

async function send({ to, subject, html, text, attachments }: SendArgs) {
  const t = getTransporter();
  await t.sendMail({
    from,
    to,
    subject,
    html,
    text,
    attachments: attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      cid: a.cid,
      contentType: a.contentType ?? "image/png",
      contentDisposition: "inline",
    })),
  });
}

/**
 * Resolve an `<img src>` value for the code.in logo, in priority order:
 *  1. `MAIL_LOGO_URL` env var (set to a hosted PNG/SVG URL — best for Outlook).
 *  2. The SVG file at /public/code.in-logo.svg, inlined as a base64 data URL.
 *  3. `null` — caller falls back to a styled text wordmark.
 *
 * For best email-client compatibility (esp. Outlook) host a PNG and set
 * MAIL_LOGO_URL. Tightly cropped 240×60 PNG is ideal.
 */
let cachedLogoSrc: string | null | undefined;
function getLogoSrc(): string | null {
  if (cachedLogoSrc !== undefined) return cachedLogoSrc;
  if (process.env.MAIL_LOGO_URL) {
    cachedLogoSrc = process.env.MAIL_LOGO_URL;
    return cachedLogoSrc;
  }
  try {
    const svg = readFileSync(join(process.cwd(), "public", "code.in-logo.svg"), "utf8");
    cachedLogoSrc = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
    return cachedLogoSrc;
  } catch {
    cachedLogoSrc = null;
    return null;
  }
}

const FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const MONO_STACK = "ui-monospace,'SF Mono',Menlo,Monaco,Consolas,monospace";

function header(): string {
  const logo = getLogoSrc();
  // Render logo at its natural square aspect. The SVG has built-in padding
  // around the wordmark, so the visible mark will be smaller than the box —
  // upload a tightly cropped image (e.g. 480x120 wide PNG) and point
  // MAIL_LOGO_URL at it for a sharper header.
  const logoBlock = logo
    ? `<img src="${logo}" alt="code.in" width="120" height="120" style="display:block;border:0;outline:none;line-height:0;" />`
    : `<div style="font-family:${MONO_STACK};font-size:20px;letter-spacing:0.18em;color:#D4A843;font-weight:700;text-align:center;">CODE.IN</div>`;
  return `
    <tr><td align="center" style="padding:0 0 8px;">${logoBlock}</td></tr>
    <tr><td align="center" style="padding:0 0 28px;">
      <div style="font-family:${MONO_STACK};font-size:10px;letter-spacing:0.32em;color:#8a8a85;text-transform:uppercase;">
        Future Engineers Conclave
      </div>
    </td></tr>
  `;
}

function footer(): string {
  return `
    <tr><td style="padding:32px 0 0;border-top:1px solid #2d2d2d;">
      <div style="font-family:${FONT_STACK};font-size:12px;line-height:1.6;color:#8a8a85;text-align:center;">
        ${content.footer.legal}
      </div>
      <div style="font-family:${MONO_STACK};font-size:10px;letter-spacing:0.2em;color:#5a5a55;text-align:center;text-transform:uppercase;margin-top:10px;">
        Sent from code.in · Hyderabad
      </div>
    </td></tr>
  `;
}

const wrap = (inner: string, preview = "") => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="dark light" />
  <meta name="supported-color-schemes" content="dark light" />
  <title>code.in</title>
  <style>
    @media (max-width: 600px) {
      .container { width: 100% !important; padding: 24px 18px !important; }
      .h1 { font-size: 22px !important; }
      .h2 { font-size: 18px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#1A1A1A;font-family:${FONT_STACK};color:#F5F5F0;">
  <div style="display:none;font-size:1px;color:#1A1A1A;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preview}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1A1A1A;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="container" style="width:600px;max-width:600px;background:#222;border:1px solid #2d2d2d;border-radius:14px;padding:36px;">
        ${header()}
        ${inner}
        ${footer()}
      </table>
    </td></tr>
  </table>
</body>
</html>`;

// ─── Templates ──────────────────────────────────────────────────────────────

export async function sendInviteEmail(args: { to: string; name?: string; inviteUrl: string }) {
  const greeting = args.name ? `Dear ${args.name},` : "Hello,";
  const html = wrap(
    `
    <tr><td>
      <div class="h1" style="font-family:${FONT_STACK};font-size:26px;font-weight:600;line-height:1.25;color:#F5F5F0;margin-bottom:16px;">
        You&rsquo;re invited.
      </div>
      <div style="font-family:${FONT_STACK};font-size:15px;line-height:1.65;color:#cfcfc8;margin-bottom:28px;">
        ${greeting}<br/><br/>
        An invitation-only evening for premium families navigating engineering education in the AI era. Forty families. One conversation.
      </div>
    </td></tr>
    <tr><td align="left" style="padding-bottom:28px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr><td bgcolor="#D4A843" style="border-radius:10px;">
          <a href="${args.inviteUrl}" target="_blank"
             style="display:inline-block;padding:14px 28px;font-family:${FONT_STACK};font-size:15px;font-weight:600;color:#1A1A1A;text-decoration:none;border-radius:10px;">
            Register your attendance →
          </a>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="font-family:${FONT_STACK};font-size:13px;line-height:1.6;color:#8a8a85;">
      Or paste this link into your browser:<br/>
      <a href="${args.inviteUrl}" style="color:#D4A843;word-break:break-all;text-decoration:none;">${args.inviteUrl}</a>
    </td></tr>
  `,
    "You're invited to the Future Engineers Conclave"
  );
  const text = `${greeting}\n\nYou're invited to the Future Engineers Conclave.\n\nRegister here: ${args.inviteUrl}\n`;
  await send({ to: args.to, subject: "Your invitation · Future Engineers Conclave", html, text });
}

export async function sendOtpEmail(args: { to: string; otp: string }) {
  const html = wrap(
    `
    <tr><td>
      <div class="h2" style="font-family:${FONT_STACK};font-size:22px;font-weight:600;line-height:1.3;color:#F5F5F0;margin-bottom:14px;">
        Your verification code
      </div>
      <div style="font-family:${FONT_STACK};font-size:15px;line-height:1.6;color:#cfcfc8;margin-bottom:24px;">
        Enter this 6-digit code in the browser to continue. It expires in 10 minutes.
      </div>
    </td></tr>
    <tr><td align="center" style="padding:8px 0 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="background:#1A1A1A;border:1px solid #2d2d2d;border-radius:12px;padding:18px 28px;">
          <div style="font-family:${MONO_STACK};font-size:36px;letter-spacing:0.45em;font-weight:700;color:#D4A843;text-align:center;">
            ${args.otp}
          </div>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="font-family:${FONT_STACK};font-size:13px;line-height:1.6;color:#8a8a85;">
      Didn&rsquo;t request this? You can ignore this email — no further action will be taken.
    </td></tr>
  `,
    `Your verification code: ${args.otp}`
  );
  const text = `Your verification code is ${args.otp}. It expires in 10 minutes.`;
  await send({ to: args.to, subject: `Your verification code: ${args.otp}`, html, text });
}

export async function sendNewRequestNotification(args: {
  to: string | string[];
  name: string;
  email: string;
  city?: string;
  reason?: string;
}) {
  const recipients = Array.isArray(args.to) ? args.to : [args.to];
  if (recipients.length === 0) return;

  const rows = [
    detailRow("Name", args.name),
    detailRow("Email", args.email),
    args.city ? detailRow("City", args.city) : "",
    args.reason ? detailRow("Note", args.reason) : "",
  ].join("");

  const html = wrap(
    `
    <tr><td>
      <div class="h2" style="font-family:${FONT_STACK};font-size:22px;font-weight:600;line-height:1.3;color:#F5F5F0;margin-bottom:12px;">
        New invite request
      </div>
      <div style="font-family:${FONT_STACK};font-size:15px;line-height:1.65;color:#cfcfc8;margin-bottom:22px;">
        Someone just submitted a request to attend the conclave.
      </div>
    </td></tr>
    <tr><td>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#1A1A1A;border:1px solid #2d2d2d;border-radius:10px;padding:18px 20px;">
        ${rows}
      </table>
    </td></tr>
    <tr><td style="font-family:${FONT_STACK};font-size:13px;line-height:1.6;color:#8a8a85;padding-top:22px;">
      Log in to the admin panel to review and decide.
    </td></tr>
  `,
    `New invite request from ${args.name}`
  );
  const text = [
    "New invite request received",
    "",
    `Name:   ${args.name}`,
    `Email:  ${args.email}`,
    args.city ? `City:   ${args.city}` : null,
    args.reason ? `Note:   ${args.reason}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  await Promise.all(
    recipients.map((to) =>
      send({ to, subject: `New invite request · ${args.name}`, html, text })
    )
  );
}

export async function sendInvitationAcceptedNotification(args: {
  to: string | string[];
  name: string;
  email: string;
  emailChanged?: boolean;
  originalEmail?: string;
}) {
  const recipients = Array.isArray(args.to) ? args.to : [args.to];
  if (recipients.length === 0) return;

  const rows = [
    detailRow("Name", args.name),
    detailRow("Email", args.email),
    args.emailChanged && args.originalEmail
      ? detailRow("Originally invited as", args.originalEmail)
      : "",
  ].join("");

  const html = wrap(
    `
    <tr><td>
      <div class="h2" style="font-family:${FONT_STACK};font-size:22px;font-weight:600;line-height:1.3;color:#F5F5F0;margin-bottom:12px;">
        Invitation accepted
      </div>
      <div style="font-family:${FONT_STACK};font-size:15px;line-height:1.65;color:#cfcfc8;margin-bottom:22px;">
        An invitee just verified their email and submitted their details.
      </div>
    </td></tr>
    <tr><td>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#1A1A1A;border:1px solid #2d2d2d;border-radius:10px;padding:18px 20px;">
        ${rows}
      </table>
    </td></tr>
    <tr><td style="font-family:${FONT_STACK};font-size:13px;line-height:1.6;color:#8a8a85;padding-top:22px;">
      Log in to the admin panel to review and approve.
    </td></tr>
  `,
    `Invitation accepted by ${args.name}`
  );
  const text = [
    "Invitation accepted",
    "",
    `Name:   ${args.name}`,
    `Email:  ${args.email}`,
    args.emailChanged && args.originalEmail ? `Originally invited as: ${args.originalEmail}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  await Promise.all(
    recipients.map((to) =>
      send({ to, subject: `Invitation accepted · ${args.name}`, html, text })
    )
  );
}

export async function sendConfirmationEmail(args: {
  to: string;
  name?: string;
  entryToken?: string;
}) {
  const greeting = args.name ? `Dear ${args.name},` : "Hello,";
  const eventRows = [
    detailRow("Date", "Saturday, June 6, 2026"),
    detailRow("Time", "6:00 PM – 8:30 PM"),
    detailRow("Venue", "T-Hub, Hyderabad"),
  ].join("");

  // Build the QR-code entry pass when we have a token. We attach the QR
  // PNG as an inline CID attachment instead of a data: URL because every
  // mainstream client (Gmail, Outlook, Apple Mail) strips data URLs from
  // <img src>. If generation fails for any reason, leave the section out —
  // the email still goes through.
  let qrSection = "";
  let qrAttachment: InlineAttachment | null = null;
  if (args.entryToken) {
    try {
      const buf = await generateQrBuffer(args.entryToken);
      qrAttachment = {
        filename: "entry-pass.png",
        content: buf,
        cid: "entry-pass-qr@codein",
        contentType: "image/png",
      };
      qrSection = `
        <tr><td style="padding-top:28px;">
          <div style="font-family:${MONO_STACK};font-size:11px;letter-spacing:0.25em;color:#D4A843;text-transform:uppercase;text-align:center;margin-bottom:14px;">
            Your entry pass
          </div>
        </td></tr>
        <tr><td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="background:#FFFFFF;border:1px solid #2d2d2d;border-radius:14px;padding:16px;">
              <img src="cid:entry-pass-qr@codein" alt="Entry QR" width="220" height="220" style="display:block;border:0;outline:none;width:220px;height:220px;" />
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="font-family:${FONT_STACK};font-size:13px;line-height:1.6;color:#cfcfc8;text-align:center;padding-top:14px;">
          Show this QR at the entrance — a volunteer will scan it and check you in.
        </td></tr>
      `;
    } catch (err) {
      console.error("[mailer] QR generation failed:", err);
    }
  }

  const html = wrap(
    `
    <tr><td>
      <div class="h1" style="font-family:${FONT_STACK};font-size:26px;font-weight:600;line-height:1.25;color:#F5F5F0;margin-bottom:14px;">
        Your seat is confirmed.
      </div>
      <div style="font-family:${FONT_STACK};font-size:15px;line-height:1.65;color:#cfcfc8;margin-bottom:26px;">
        ${greeting}<br/><br/>
        We&rsquo;re glad to have you at the Future Engineers Conclave.
      </div>
    </td></tr>
    <tr><td>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#1A1A1A;border:1px solid #2d2d2d;border-radius:10px;padding:18px 20px;">
        ${eventRows}
      </table>
    </td></tr>
    ${qrSection}
    <tr><td style="font-family:${FONT_STACK};font-size:13px;line-height:1.6;color:#8a8a85;padding-top:22px;">
      A reminder with directions and parking info will reach you on WhatsApp 24 hours before the event.
    </td></tr>
  `,
    "Your seat at the Future Engineers Conclave is confirmed"
  );
  const text = `${greeting}\n\nYour seat at the Future Engineers Conclave is confirmed.\n\nJune 6, 2026 · 6:00–8:30 PM · T-Hub, Hyderabad.${args.entryToken ? "\n\nShow your QR entry pass at the venue." : ""}`;
  await send({
    to: args.to,
    subject: "You're confirmed · Future Engineers Conclave",
    html,
    text,
    attachments: qrAttachment ? [qrAttachment] : undefined,
  });
}

// ─── helpers ────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function detailRow(label: string, value: string): string {
  return `
    <tr>
      <td style="font-family:${MONO_STACK};font-size:11px;letter-spacing:0.18em;color:#D4A843;text-transform:uppercase;padding:6px 0;width:36%;vertical-align:top;">
        ${escapeHtml(label)}
      </td>
      <td style="font-family:${FONT_STACK};font-size:14px;line-height:1.55;color:#F5F5F0;padding:6px 0;vertical-align:top;">
        ${escapeHtml(value)}
      </td>
    </tr>
  `;
}
