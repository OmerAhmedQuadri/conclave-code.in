import { z } from "zod";
import type { ObjectId } from "mongodb";

export const addAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type AddAdminInput = z.infer<typeof addAdminSchema>;

export interface AdminDoc {
  _id?: ObjectId;
  email: string;
  passwordHash: string;
  role?: "admin";
  createdAt: Date;
  createdBy?: string;
}

export interface AdminListItem {
  id?: string;
  email: string;
  createdAt: Date;
  createdBy?: string;
}

export type AdminListResponse =
  | { ok: true; bootstrapEmail: string | null; admins: AdminListItem[] }
  | { ok: false; message: string };

export type AdminMutationResponse = { ok: true } | { ok: false; message: string };
