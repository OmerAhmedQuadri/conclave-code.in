import { z } from "zod";
import type { ObjectId } from "mongodb";

export const addVolunteerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2, "Name is too short").max(80),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type AddVolunteerInput = z.infer<typeof addVolunteerSchema>;

export const volunteerLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});
export type VolunteerLoginInput = z.infer<typeof volunteerLoginSchema>;

export interface VolunteerDoc {
  _id?: ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
  createdBy?: string;
}

export interface VolunteerListItem {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  createdBy?: string;
  assignedCount?: number;
}

export type VolunteerListResponse =
  | { ok: true; volunteers: VolunteerListItem[] }
  | { ok: false; message: string };

export type VolunteerMutationResponse = { ok: true } | { ok: false; message: string };

export const assignInviteesSchema = z.object({
  volunteerId: z.string().min(1),
  inviteeIds: z.array(z.string().min(1)).min(1).max(500),
});
export type AssignInviteesInput = z.infer<typeof assignInviteesSchema>;
