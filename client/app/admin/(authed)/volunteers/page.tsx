import { invitees, volunteers } from "@/lib/db";
import { VolunteersManager, type VolunteerRow } from "@/components/volunteers-manager";

export const dynamic = "force-dynamic";

export default async function AdminVolunteersPage() {
  const volCol = await volunteers();
  const docs = await volCol
    .find({}, { projection: { passwordHash: 0 } })
    .sort({ createdAt: -1 })
    .toArray();

  // Count assignments per volunteer
  const inviteeCol = await invitees();
  const counts = await inviteeCol
    .aggregate<{ _id: import("mongodb").ObjectId; n: number }>([
      { $match: { assignedVolunteerId: { $exists: true } } },
      { $group: { _id: "$assignedVolunteerId", n: { $sum: 1 } } },
    ])
    .toArray();
  const countMap = new Map(counts.map((c) => [c._id.toString(), c.n]));

  const rows: VolunteerRow[] = docs.map((d) => ({
    id: d._id?.toString() ?? "",
    email: d.email,
    name: d.name,
    createdAt: d.createdAt?.toISOString(),
    createdBy: d.createdBy,
    assignedCount: countMap.get(d._id?.toString() ?? "") ?? 0,
  }));

  return <VolunteersManager initialRows={rows} />;
}
