import QRCode from "qrcode";

/**
 * Render a QR code as a base64 PNG data URL.
 * Used to embed the entry pass directly in confirmation emails.
 */
export async function generateQrDataUrl(payload: string): Promise<string> {
  return await QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    width: 320,
    margin: 1,
    color: {
      dark: "#1A1A1A",
      light: "#FFFFFF",
    },
  });
}
