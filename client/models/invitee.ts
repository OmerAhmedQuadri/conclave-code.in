import type { ObjectId } from "mongodb";
import type { RegisterFormData } from "@/models/register";

export type InviteeStatus =
  | "requested"
  | "invited"
  | "registered"
  | "otp_verified"
  | "approved"
  | "rejected";

export interface InviteeDoc {
  _id?: ObjectId;
  email: string;
  name?: string;
  token: string;
  status: InviteeStatus;
  source?: "admin" | "portal";
  otp?: string;
  otpExpiresAt?: Date;
  otpAttempts?: number;
  formData?: RegisterFormData;
  reason?: string;
  requestedAt?: Date;
  invitedBy?: string;
  invitedAt?: Date;
  registeredAt?: Date;
  verifiedAt?: Date;
  decidedAt?: Date;
  decidedBy?: string;
}

export interface InviteeListItem {
  id?: string;
  email: string;
  name?: string;
  status: InviteeStatus;
  source?: "admin" | "portal";
  token: string;
  reason?: string;
  invitedBy?: string;
  decidedBy?: string;
  requestedAt?: Date;
  invitedAt?: Date;
  registeredAt?: Date;
  verifiedAt?: Date;
  decidedAt?: Date;
  formData?: RegisterFormData;
}

export type InviteeListResponse =
  | { ok: true; invitees: InviteeListItem[] }
  | { ok: false; message: string };

export type InviteePublicResponse =
  | { ok: true; invitee: { email: string; name?: string; status: InviteeStatus } }
  | { ok: false; message: string };

export type InviteeDeleteResponse = { ok: true } | { ok: false; message: string };
