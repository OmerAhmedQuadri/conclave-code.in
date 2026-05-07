import { z } from "zod";
import type { ObjectId } from "mongodb";

export const addAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type AddAdminInput = z.infer<typeof addAdminSchema>;

export const updateAdminSchema = z.object({
  receiveEmails: z.boolean().optional(),
});
export type UpdateAdminInput = z.infer<typeof updateAdminSchema>;

export interface AdminDoc {
  _id?: ObjectId;
  email: string;
  passwordHash: string;
  role?: "admin";
  receiveEmails?: boolean;
  // True for the synthetic doc that stores the bootstrap admin's preferences.
  // The bootstrap admin is authenticated via env vars (ADMIN_EMAIL/ADMIN_PASSWORD)
  // — this doc only exists to persist toggles like receiveEmails; its
  // passwordHash is intentionally an empty string and never used for login.
  isBootstrap?: boolean;
  createdAt: Date;
  createdBy?: string;
}

export interface AdminListItem {
  id?: string;
  email: string;
  receiveEmails?: boolean;
  createdAt: Date;
  createdBy?: string;
}

export type AdminListResponse =
  | { ok: true; bootstrapEmail: string | null; admins: AdminListItem[] }
  | { ok: false; message: string };

export type AdminMutationResponse = { ok: true } | { ok: false; message: string };
