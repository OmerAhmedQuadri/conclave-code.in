export type RegisterStatus = "idle" | "submitting" | "otp" | "verifying" | "success" | "error";

export type ApiOk<T = Record<string, never>> = { ok: true } & T;
export type ApiErr = { ok: false; message: string };
export type ApiResponse<T = Record<string, never>> = ApiOk<T> | ApiErr;

export interface PublicInvitee {
  email: string;
  name?: string;
  status: "invited" | "registered" | "otp_verified" | "approved" | "rejected";
}
