import { z } from "zod";
import type { ObjectId } from "mongodb";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type LoginInput = z.infer<typeof loginSchema>;

export type Role = "admin";

export interface LoginUserDoc {
  _id?: ObjectId;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: Date;
}

export type LoginResponse =
  | { ok: true; email: string; role: Role }
  | { ok: false; message: string };
