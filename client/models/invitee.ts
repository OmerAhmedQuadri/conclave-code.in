import type { ObjectId } from "mongodb";
import type { RegisterFormData } from "@/models/register";
import type { HearAbout, RequesterRole } from "@/models/request-invite";

export interface RequestInviteData {
  role: RequesterRole;
  studentName: string;
  studentAge: string;
  studentPhone: string;
  studentEmail?: string;
  parentPhone?: string;
  school: string;
  city: string;
  hearAbout: HearAbout;
  referralFrom?: string;
  question?: string;
}

export type InviteeStatus =
  | "requested"
  | "invited"
  | "registered"
  | "otp_verified"
  | "approved"
  | "rejected";

export const autoApproveModes = ["immediate", "delayed", "never"] as const;
export type AutoApproveMode = (typeof autoApproveModes)[number];
export const AUTO_APPROVE_DELAY_MS = 2 * 60 * 60 * 1000; // 2 hours

export interface InviteeDoc {
  _id?: ObjectId;
  email: string;
  originalEmail?: string;
  name?: string;
  token: string;
  status: InviteeStatus;
  source?: "admin" | "portal";
  autoApproveMode?: AutoApproveMode;
  autoApproveAfter?: Date;
  refreshCount?: number;
  lastRefreshedAt?: Date;
  assignedVolunteerId?: ObjectId;
  assignedAt?: Date;
  assignedBy?: string;
  otp?: string;
  otpExpiresAt?: Date;
  otpAttempts?: number;
  formData?: RegisterFormData;
  requestData?: RequestInviteData;
  reason?: string;
  referralCode?: string;
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
  originalEmail?: string;
  name?: string;
  status: InviteeStatus;
  source?: "admin" | "portal";
  autoApproveMode?: AutoApproveMode;
  autoApproveAfter?: Date;
  refreshCount?: number;
  lastRefreshedAt?: Date;
  assignedVolunteerId?: string;
  assignedVolunteerName?: string;
  token: string;
  reason?: string;
  referralCode?: string;
  invitedBy?: string;
  decidedBy?: string;
  requestedAt?: Date;
  invitedAt?: Date;
  registeredAt?: Date;
  verifiedAt?: Date;
  decidedAt?: Date;
  formData?: RegisterFormData;
  requestData?: RequestInviteData;
}



export type InviteeListResponse =
  | { ok: true; invitees: InviteeListItem[] }
  | { ok: false; message: string };

export type InviteePublicResponse =
  | { ok: true; invitee: { email: string; name?: string; status: InviteeStatus } }
  | { ok: false; message: string };

export type InviteeDeleteResponse = { ok: true } | { ok: false; message: string };
