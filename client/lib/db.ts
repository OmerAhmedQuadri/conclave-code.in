import { MongoClient, type Db, type Collection } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI env var");

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = new MongoClient(uri).connect();
    }
    return global._mongoClientPromise;
  }
  return new MongoClient(uri).connect();
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  const dbName = process.env.MONGODB_DB ?? "fe-conclave";
  return client.db(dbName);
}

export type InviteeStatus =
  | "requested"
  | "invited"
  | "registered"
  | "otp_verified"
  | "approved"
  | "rejected";

export interface InviteeDoc {
  _id?: import("mongodb").ObjectId;
  email: string;
  name?: string;
  token: string;
  status: InviteeStatus;
  otp?: string;
  otpExpiresAt?: Date;
  otpAttempts?: number;
  formData?: Record<string, unknown>;
  reason?: string;             // free-text from "Request invite" form
  requestedAt?: Date;
  invitedBy?: string;
  invitedAt?: Date;
  registeredAt?: Date;
  verifiedAt?: Date;
  decidedAt?: Date;
  decidedBy?: string;
}

export interface AdminDoc {
  _id?: import("mongodb").ObjectId;
  email: string;
  passwordHash: string;
  createdAt: Date;
  createdBy?: string;
}

export async function invitees(): Promise<Collection<InviteeDoc>> {
  const db = await getDb();
  const col = db.collection<InviteeDoc>("invitees");
  await col.createIndex({ token: 1 }, { unique: true });
  await col.createIndex({ email: 1 }, { unique: true });
  return col;
}

export async function admins(): Promise<Collection<AdminDoc>> {
  const db = await getDb();
  const col = db.collection<AdminDoc>("admins");
  await col.createIndex({ email: 1 }, { unique: true });
  return col;
}
