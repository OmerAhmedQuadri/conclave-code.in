import { schools } from "@/lib/db";
import { SchoolsManager, type SchoolRow } from "@/components/schools-manager";

export const dynamic = "force-dynamic";

export default async function AdminSchoolsPage() {
  const col = await schools();
  const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
  const rows: SchoolRow[] = docs.map((d) => ({
    id: d._id?.toString() ?? "",
    name: d.name,
    pocs: d.pocs,
    createdAt: d.createdAt?.toISOString(),
    createdBy: d.createdBy,
  }));
  return <SchoolsManager initialRows={rows} />;
}
