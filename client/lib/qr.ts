import QRCode from "qrcode";

const QR_OPTIONS = {
  errorCorrectionLevel: "M" as const,
  width: 480,
  margin: 1,
  color: {
    dark: "#1A1A1A",
    light: "#FFFFFF",
  },
};

/**
 * Render a QR code as a base64 PNG data URL.
 * Useful for previewing in the browser. Email clients (Gmail, Outlook,
 * Apple Mail) usually strip data URLs for security, so for emails prefer
 * `generateQrBuffer` + an inline CID attachment instead.
 */
export async function generateQrDataUrl(payload: string): Promise<string> {
  return await QRCode.toDataURL(payload, QR_OPTIONS);
}

/**
 * Render a QR code as a raw PNG Buffer suitable for nodemailer inline
 * attachments referenced by `cid:<id>` in the HTML body.
 */
export async function generateQrBuffer(payload: string): Promise<Buffer> {
  return await QRCode.toBuffer(payload, { type: "png", ...QR_OPTIONS });
}
