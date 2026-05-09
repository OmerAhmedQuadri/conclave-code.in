"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { savePendingDraft } from "@/lib/pending-invite-draft";

export interface RequestInviteFormProps {
  /**
   * Optional callback wired to the "Already submitted? Check invitation
   * status →" link rendered next to the submit button. When omitted the
   * link is hidden.
   */
  onCheckStatus?: () => void;
}

/**
 * Step 1 of the invite-request flow. Collects the visitor's name + email +
 * (optional) referral code, sends the OTP, then redirects them to
 * /request-invite/verify where they enter the code and fill the rest.
 */
export function RequestInviteForm({ onCheckStatus }: RequestInviteFormProps = {}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedName = name.trim();
      const res = await fetch("/api/request-invite/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, email: trimmedEmail }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!json.ok) throw new Error(json.message ?? "Could not send OTP");

      // Persist the draft so the verify page can pick it up after navigation.
      savePendingDraft({
        name: trimmedName,
        email: trimmedEmail,
        referralCode: referralCode.trim(),
      });
      router.push("/request-invite/verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="name">Your name</Label>
        <Input
          id="name"
          required
          autoComplete="name"
          minLength={2}
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="As you'd like us to address you"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="referralCode">
          Referral code <span className="text-cream-40">(optional)</span>
        </Label>
        <Input
          id="referralCode"
          maxLength={60}
          value={referralCode}
          onChange={(e) => setReferralCode(e.target.value)}
          placeholder="If someone gave you a code, enter it here"
        />
      </div>
      <div className="flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        {onCheckStatus ? (
          <button
            type="button"
            onClick={onCheckStatus}
            className="font-mono text-xs uppercase tracking-[0.2em] text-cream-40 transition-colors hover:text-gold sm:max-w-sm"
          >
            Check invitation status →
          </button>
        ) : (
          <span className="hidden sm:inline" />
        )}
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Sending..." : "Request invite"}
        </Button>
      </div>
      {error && (
        <p
          className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}
    </form>
  );
}
