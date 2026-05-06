import { z } from "zod";
import type { ObjectId } from "mongodb";
import { registrationSchema } from "@/lib/validations";

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

export type RegisterResponse = { ok: true; email: string } | { ok: false; message: string };
