import { randomBytes, scryptSync } from "node:crypto";
import { MongoClient } from "mongodb";

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${derived.toString("base64")}`;
}

async function main() {
  const email  = "syedomerali2006@gmail.com"
  const password = "omer@123"

  if (!email || !password) {
    console.error("Usage: tsx scripts/add-admin.ts <email> <password>");
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI");
  const dbName = process.env.MONGODB_DB ?? "fe-conclave";

  const newemail = email.trim().toLowerCase();
  const passwordHash = hashPassword(password);

  const client = await new MongoClient(uri).connect();
  try {
    const col = client.db(dbName).collection("admins");
    await col.createIndex({ email: 1 }, { unique: true });
    await col.updateOne(
      { email: newemail },
      {
        $set: { email: newemail, passwordHash, role: "admin" },
        $setOnInsert: { createdAt: new Date(), createdBy: "script" },
      },
      { upsert: true },
    );
    console.log(`Admin upserted: ${email}`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
