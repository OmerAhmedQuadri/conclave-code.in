/**
 * Runtime configuration derived from environment variables.
 * Edit `.env.local` to change these values.
 */

export const siteConfig = {
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "+919959682957",
  eventStartIso: process.env.NEXT_PUBLIC_EVENT_START_ISO ?? "2026-05-23T18:00:00+05:30",
  eventEndIso: process.env.NEXT_PUBLIC_EVENT_END_ISO ?? "2026-05-23T20:30:00+05:30",
} as const;

export const whatsappLink = (() => {
  const cleaned = siteConfig.whatsappNumber.replace(/[^0-9+]/g, "");
  return `https://wa.me/${cleaned.replace("+", "")}`;
})();
