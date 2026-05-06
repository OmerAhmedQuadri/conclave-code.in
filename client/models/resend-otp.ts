import { z } from "zod";

export const resendOtpSchema = z.object({
  token: z.string().min(10),
});

export type ResendOtpInput = z.infer<typeof resendOtpSchema>;

export type ResendOtpResponse =
  | { ok: true }
  | { ok: false; message: string };
