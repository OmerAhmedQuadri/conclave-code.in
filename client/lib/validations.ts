import { z } from "zod";

const phoneRegex = /^\+?[0-9\s-]{10,15}$/;

export const registrationSchema = z.object({
  parentName: z
    .string()
    .min(2, "Please enter your full name")
    .max(80, "Name is too long"),
  parentPhone: z
    .string()
    .regex(phoneRegex, "Please enter a valid phone number"),
  studentName: z
    .string()
    .min(2, "Please enter the student's name")
    .max(80, "Name is too long"),
  studentAge: z.string().min(1, "Please select an age"),
  school: z.string().min(2, "Please enter the school or college name").max(120),
  city: z.string().min(2, "Please enter your city").max(60),
  referral: z.string().min(1, "Please tell us how you heard about us"),
  question: z
    .string()
    .max(500, "Please keep this under 500 characters")
    .optional()
    .or(z.literal("")),
});

export type RegistrationFormValues = z.infer<typeof registrationSchema>;

export const inviteSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  name: z.string().max(80).optional().or(z.literal("")),
});

export const requestInviteSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  name: z.string().min(2, "Please enter your name").max(80),
  city: z.string().max(60).optional().or(z.literal("")),
  reason: z
    .string()
    .max(500, "Please keep this under 500 characters")
    .optional()
    .or(z.literal("")),
});

export type RequestInviteFormValues = z.infer<typeof requestInviteSchema>;

export const verifyOtpSchema = z.object({
  token: z.string().min(10),
  otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const adminDecisionSchema = z.object({
  token: z.string().min(10),
  decision: z.enum(["approve", "reject"]),
});

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const addAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
