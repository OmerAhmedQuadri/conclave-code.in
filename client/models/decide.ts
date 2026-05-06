import { z } from "zod";

export const decideSchema = z.object({
  token: z.string().min(10),
  decision: z.enum(["approve", "reject"]),
});

export type DecideInput = z.infer<typeof decideSchema>;

export type DecideStatus = "approved" | "rejected";

export type DecideResponse =
  | { ok: true; status?: DecideStatus; warning?: string }
  | { ok: false; message: string };
