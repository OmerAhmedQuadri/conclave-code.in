import { z } from "zod";

export const verifyOtpSchema = z.object({
  token: z.string().min(10),
  otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export type VerifyOtpResponse =
  | { ok: true; alreadyVerified?: boolean }
  | { ok: false; message: string };
