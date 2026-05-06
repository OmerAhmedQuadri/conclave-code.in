import { z } from "zod";

export const requestInviteSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  name: z.string().min(2, "Please enter your name").max(80),
  city: z.string().max(60).optional().or(z.literal("")),
  reason: z.string().max(500, "Please keep this under 500 characters").optional().or(z.literal("")),
});

export type RequestInviteInput = z.infer<typeof requestInviteSchema>;

export type RequestInviteResponse = { ok: true; message?: string } | { ok: false; message: string };
