import { z } from "zod";
import type { ObjectId } from "mongodb";

export const pocSchema = z.object({
  name: z.string().min(1, "POC name required").max(80),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
});
export type PocInput = z.infer<typeof pocSchema>;

export interface Poc {
  name: string;
  email?: string;
  phone?: string;
}

export const addSchoolSchema = z.object({
  name: z.string().min(2, "School name is too short").max(160),
  pocs: z.array(pocSchema).optional(),
});
export type AddSchoolInput = z.infer<typeof addSchoolSchema>;

export const updateSchoolSchema = z.object({
  name: z.string().min(2).max(160).optional(),
  pocs: z.array(pocSchema).optional(),
});
export type UpdateSchoolInput = z.infer<typeof updateSchoolSchema>;

export interface SchoolDoc {
  _id?: ObjectId;
  name: string;
  pocs?: Poc[];
  createdAt: Date;
  createdBy?: string;
}

export interface SchoolListItem {
  id: string;
  name: string;
  pocs?: Poc[];
  createdAt: Date;
  createdBy?: string;
}

export type SchoolListResponse =
  | { ok: true; schools: SchoolListItem[] }
  | { ok: false; message: string };

export type SchoolMutationResponse = { ok: true } | { ok: false; message: string };
