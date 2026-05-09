"use client";

export const PENDING_INVITE_DRAFT_KEY = "fec_pending_invite_draft";

export interface PendingInviteDraft {
  name: string;
  email: string;
  referralCode: string;
}

export function savePendingDraft(draft: PendingInviteDraft) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PENDING_INVITE_DRAFT_KEY, JSON.stringify(draft));
}

export function loadPendingDraft(): PendingInviteDraft | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(PENDING_INVITE_DRAFT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PendingInviteDraft>;
    if (typeof parsed?.email === "string" && typeof parsed?.name === "string") {
      return {
        name: parsed.name,
        email: parsed.email,
        referralCode: parsed.referralCode ?? "",
      };
    }
  } catch {
    // Fall through to return null
  }
  return null;
}

export function clearPendingDraft() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PENDING_INVITE_DRAFT_KEY);
}
