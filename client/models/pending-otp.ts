import type { ObjectId } from "mongodb";

export interface PendingOtpDoc {
  _id?: ObjectId;
  email: string;
  name: string;
  otp: string;
  expiresAt: Date;
  attempts: number;
  verifiedAt?: Date;
  createdAt: Date;
}
