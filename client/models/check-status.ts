import { z } from "zod";
import type { InviteeStatus } from "@/models/invitee";

export const checkStatusSendOtpSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});
export type CheckStatusSendOtpInput = z.infer<typeof checkStatusSendOtpSchema>;
export type CheckStatusSendOtpResponse = { ok: true } | { ok: false; message: string };

export const checkStatusVerifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});
export type CheckStatusVerifyOtpInput = z.infer<typeof checkStatusVerifyOtpSchema>;

export const checkStatusRefreshSchema = z.object({
  email: z.string().email(),
  verificationToken: z.string().min(10),
});
export type CheckStatusRefreshInput = z.infer<typeof checkStatusRefreshSchema>;

export interface CheckStatusInfo {
  email: string;
  name?: string;
  status: InviteeStatus;
  source?: "admin" | "portal";
  registerUrl?: string; // for admin-invited users still in "invited" state
}

export type CheckStatusResponse =
  | { ok: true; verificationToken: string; info: CheckStatusInfo }
  | { ok: false; message: string };

export type CheckStatusRefreshResponse =
  | { ok: true; info: CheckStatusInfo }
  | { ok: false; message: string };
