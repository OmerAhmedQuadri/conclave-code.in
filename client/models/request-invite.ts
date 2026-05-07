import { z } from "zod";

// Stage 1: send OTP to email
export const sendInviteOtpSchema = z.object({
  name: z.string().min(2, "Please enter your name").max(80),
  email: z.string().email("Please enter a valid email"),
});
export type SendInviteOtpInput = z.infer<typeof sendInviteOtpSchema>;
export type SendInviteOtpResponse = { ok: true } | { ok: false; message: string };

// Stage 2: verify OTP
export const verifyInviteOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});
export type VerifyInviteOtpInput = z.infer<typeof verifyInviteOtpSchema>;
export type VerifyInviteOtpResponse =
  | { ok: true; verificationToken: string }
  | { ok: false; message: string };

// Stage 3: final submit (requires verification token from stage 2)
export const hearAboutValues = [
  "school_college",
  "instagram",
  "whatsapp",
  "referral",
  "other",
] as const;
export type HearAbout = (typeof hearAboutValues)[number];

export const requestInviteSchema = z
  .object({
    name: z.string().min(2, "Please enter your name").max(80),
    email: z.string().email("Please enter a valid email"),
    verificationToken: z.string().min(10),
    referralCode: z.string().max(60).optional().or(z.literal("")),
    studentName: z.string().min(2, "Please enter the student's name").max(80),
    studentAge: z.string().min(1, "Please enter the student's age").max(3),
    school: z.string().min(2, "Please select or enter a school").max(160),
    city: z.string().min(2, "Please enter your city").max(60),
    hearAbout: z.enum(hearAboutValues, { message: "Please choose one" }),
    referralFrom: z.string().max(120).optional().or(z.literal("")),
    question: z.string().max(500, "Please keep this under 500 characters").optional().or(z.literal("")),
  })
  .superRefine((val, ctx) => {
    if (val.hearAbout === "referral" && !val.referralFrom?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["referralFrom"],
        message: "Please tell us who referred you",
      });
    }
  });

export type RequestInviteInput = z.infer<typeof requestInviteSchema>;
export type RequestInviteResponse = { ok: true; message?: string } | { ok: false; message: string };
