import { z } from "zod";
import type { ObjectId } from "mongodb";
import { registrationSchema } from "@/lib/validations";
import { hearAboutValues } from "@/models/request-invite";

// ── Legacy (unused since the register flow was rewritten — kept for type imports
//    elsewhere in the codebase) ───────────────────────────────────────────────
export const registerBodySchema = z.object({
  token: z.string().min(10),
  data: registrationSchema,
});
export type RegisterInput = z.infer<typeof registerBodySchema>;
export type RegisterFormData = z.infer<typeof registrationSchema>;

export type RegisteredInviteeStatus =
  | "requested"
  | "invited"
  | "registered"
  | "otp_verified"
  | "approved"
  | "rejected";

export interface RegisteredInviteeDoc {
  _id?: ObjectId;
  email: string;
  name?: string;
  token: string;
  status: RegisteredInviteeStatus;
  otp?: string;
  otpExpiresAt?: Date;
  otpAttempts?: number;
  formData?: RegisterFormData;
  registeredAt?: Date;
}

// ── New register flow (mirrors the request-invite flow) ─────────────────────

export const registerSendOtpSchema = z.object({
  token: z.string().min(10),
  email: z.string().email("Please enter a valid email"),
});
export type RegisterSendOtpInput = z.infer<typeof registerSendOtpSchema>;
export type RegisterSendOtpResponse = { ok: true } | { ok: false; message: string };

export const registerVerifyOtpSchema = z.object({
  token: z.string().min(10),
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});
export type RegisterVerifyOtpInput = z.infer<typeof registerVerifyOtpSchema>;
export type RegisterVerifyOtpResponse =
  | { ok: true; verificationToken: string }
  | { ok: false; message: string };

export const registerSubmitSchema = z
  .object({
    token: z.string().min(10),
    email: z.string().email(),
    verificationToken: z.string().min(10),
    name: z.string().min(2).max(80),
    studentName: z.string().min(2, "Please enter the student's name").max(80),
    studentAge: z.string().min(1, "Please enter the student's age").max(3),
    school: z.string().min(2, "Please select or enter a school").max(160),
    city: z.string().min(2, "Please enter your city").max(60),
    hearAbout: z.enum(hearAboutValues, { message: "Please choose one" }),
    referralFrom: z.string().max(120).optional().or(z.literal("")),
    question: z.string().max(500).optional().or(z.literal("")),
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
export type RegisterSubmitInput = z.infer<typeof registerSubmitSchema>;
export type RegisterResponse =
  | { ok: true; email: string; emailChanged?: boolean }
  | { ok: false; message: string };
