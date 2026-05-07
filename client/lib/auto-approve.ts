import { invitees } from "@/lib/db";
import { sendConfirmationEmail } from "@/lib/mailer";

/**
 * Auto-approve any invitees whose admin opted into auto-approval and whose
 * 2-hour grace period has elapsed.
 *
 * Called from the admin dashboard server page and the /api/admin/invitees GET
 * route, so processing happens on demand whenever an admin checks the list.
 * No external cron required.
 */
export async function processAutoApprovals(): Promise<number> {
  const col = await invitees();
  const now = new Date();
  const eligible = await col
    .find({
      status: "otp_verified",
      source: "admin",
      autoApprove: true,
      autoApproveAfter: { $lte: now },
    })
    .toArray();

  if (eligible.length === 0) return 0;

  await col.updateMany(
    { _id: { $in: eligible.map((d) => d._id!) } },
    {
      $set: {
        status: "approved",
        decidedAt: now,
        decidedBy: "auto",
      },
    }
  );

  // Fire-and-forget confirmation emails — failures shouldn't block the dashboard
  for (const doc of eligible) {
    sendConfirmationEmail({ to: doc.email, name: doc.name }).catch((err) => {
      console.error("[auto-approve] confirmation email failed:", doc.email, err);
    });
  }

  return eligible.length;
}
