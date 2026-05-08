import { z } from "zod";
import { autoApproveModes } from "@/models/invitee";

export const inviteSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  name: z.string().max(80).optional().or(z.literal("")),
  autoApproveMode: z.enum(autoApproveModes).optional(),
});

export type InviteInput = z.infer<typeof inviteSchema>;

export type InviteResponse =
  | { ok: true; inviteUrl: string; upgraded?: boolean }
  | { ok: false; message: string };
