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

export const roleValues = ["student", "parent"] as const;
export type RequesterRole = (typeof roleValues)[number];

const phoneSchema = z
  .string()
  .regex(/^\+?[0-9\s-]{7,20}$/, "Please enter a valid phone number");

export const requestInviteSchema = z
  .object({
    name: z.string().min(2, "Please enter your name").max(80),
    email: z.string().email("Please enter a valid email"),
    verificationToken: z.string().min(10),
    referralCode: z.string().max(60).optional().or(z.literal("")),
    role: z.enum(roleValues, { message: "Please tell us who you are" }),
    studentName: z.string().min(2, "Please enter a name").max(80),
    studentAge: z.string().min(1, "Please enter an age").max(3),
    studentPhone: phoneSchema,
    // Only required when role === "parent"
    studentEmail: z.string().email("Invalid email").optional().or(z.literal("")),
    parentPhone: z.string().optional().or(z.literal("")),
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
    if (val.role === "parent") {
      if (!val.parentPhone?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["parentPhone"],
          message: "Please enter your phone number",
        });
      } else {
        const r = phoneSchema.safeParse(val.parentPhone.trim());
        if (!r.success) {
          ctx.addIssue({
            code: "custom",
            path: ["parentPhone"],
            message: r.error.issues[0]?.message ?? "Invalid phone",
          });
        }
      }
      if (!val.studentEmail?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["studentEmail"],
          message: "Please enter the student's email",
        });
      }
    }
  });

export type RequestInviteInput = z.infer<typeof requestInviteSchema>;
export type RequestInviteResponse = { ok: true; message?: string } | { ok: false; message: string };
