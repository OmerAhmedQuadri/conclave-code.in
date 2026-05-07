"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  requestInviteSchema,
  hearAboutValues,
  type HearAbout,
  type RequestInviteInput,
} from "@/models/request-invite";
import { content } from "@/lib/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveStatusSession } from "@/components/invitation-status-checker";
import { cn } from "@/lib/utils";

type Stage = "details" | "otp" | "form" | "submitted";

const OTHER_SCHOOL = "__other__";

const hearAboutLabels: Record<HearAbout, string> = {
  school_college: "School / college",
  instagram: "Instagram",
  whatsapp: "WhatsApp group",
  referral: "Referral",
  other: "Other",
};

interface SchoolOption {
  id: string;
  name: string;
}

export interface RequestInviteFormProps {
  /**
   * Called after a successful submit. The user is now "logged in" — their
   * email + verification token have been saved to sessionStorage so the
   * status-check view can pick them up. Use this to navigate the parent
   * UI to the status view.
   */
  onLoggedIn?: () => void;
}

export function RequestInviteForm({ onLoggedIn }: RequestInviteFormProps = {}) {
  const [stage, setStage] = useState<Stage>("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const onOtpVerified = (token: string) => {
    setVerificationToken(token);
    setStage("form");
  };

  const onEditEmail = () => {
    setVerificationToken(null);
    setStage("details");
  };

  const onSubmitted = (msg?: string) => {
    if (verificationToken) {
      saveStatusSession(email.trim().toLowerCase(), verificationToken);
    }
    if (onLoggedIn) {
      onLoggedIn();
      return;
    }
    setSuccessMessage(msg ?? null);
    setStage("submitted");
  };

  if (stage === "submitted") {
    const { success } = content.request;
    return (
      <div className="space-y-6">
        <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">{success.label}</p>
        <h2 className="text-balance font-heading text-3xl font-bold leading-tight text-cream md:text-4xl">
          {success.title}
        </h2>
        <p className="max-w-lg font-sans text-base text-cream-70 md:text-lg">
          {successMessage ?? success.body}
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-sans text-sm text-cream-70 transition-colors hover:text-gold"
        >
          ← {success.backLink}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {stage === "form" && <StageIndicator stage={stage} />}

      {stage === "details" && (
        <DetailsStage
          name={name}
          email={email}
          referralCode={referralCode}
          setName={setName}
          setEmail={setEmail}
          setReferralCode={setReferralCode}
          onSent={() => setStage("otp")}
        />
      )}

      {stage === "otp" && (
        <OtpStage
          name={name}
          email={email}
          onVerified={onOtpVerified}
          onEditEmail={onEditEmail}
        />
      )}

      {stage === "form" && verificationToken && (
        <FullFormStage
          name={name}
          email={email}
          referralCode={referralCode}
          verificationToken={verificationToken}
          onEditEmail={onEditEmail}
          onSubmitted={onSubmitted}
        />
      )}
    </div>
  );
}

function StageIndicator({ stage }: { stage: Stage }) {
  const steps = [
    { key: "details", label: "Verify email" },
    { key: "otp", label: "Enter OTP" },
    { key: "form", label: "Your details" },
  ];
  const idx = steps.findIndex((s) => s.key === stage);
  return (
    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em]">
      {steps.map((s, i) => {
        const active = i === idx;
        const done = i < idx;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full border text-[10px]",
                active && "border-gold bg-gold/15 text-gold",
                done && "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
                !active && !done && "border-border text-cream-40"
              )}
            >
              {done ? "✓" : i + 1}
            </span>
            <span className={cn(active ? "text-gold" : done ? "text-emerald-300" : "text-cream-40")}>
              {s.label}
            </span>
            {i < steps.length - 1 && <span className="text-cream-40">·</span>}
          </div>
        );
      })}
    </div>
  );
}

function DetailsStage({
  name,
  email,
  referralCode,
  setName,
  setEmail,
  setReferralCode,
  onSent,
}: {
  name: string;
  email: string;
  referralCode: string;
  setName: (v: string) => void;
  setEmail: (v: string) => void;
  setReferralCode: (v: string) => void;
  onSent: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/request-invite/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!json.ok) throw new Error(json.message ?? "Could not send OTP");
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSend} noValidate className="space-y-6">
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
        <p className="font-sans text-xs text-cream-40 sm:max-w-sm">
          We&apos;ll send a 6-digit code to verify your email. The rest of the form opens up after that.
        </p>
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Sending..." : "Request invite"}
        </Button>
      </div>
      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function OtpStage({
  name,
  email,
  onVerified,
  onEditEmail,
}: {
  name: string;
  email: string;
  onVerified: (token: string) => void;
  onEditEmail: () => void;
}) {
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/request-invite/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const json = (await res.json()) as { ok: boolean; verificationToken?: string; message?: string };
      if (!json.ok || !json.verificationToken) throw new Error(json.message ?? "Could not verify");
      onVerified(json.verificationToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    setResending(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/request-invite/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!json.ok) throw new Error(json.message ?? "Could not resend");
      setInfo("A new code has been sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setResending(false);
    }
  };

  return (
    <form onSubmit={onVerify} noValidate className="space-y-6">
      <div>
        <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">CHECK YOUR INBOX</p>
        <p className="mt-2 text-sm text-cream-70">
          We sent a 6-digit code to <span className="text-cream">{email}</span>.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="otp">One-time code</Label>
        <Input
          id="otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          pattern="\d{6}"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          placeholder="123456"
          className="font-mono tracking-[0.4em]"
        />
      </div>
      <div className="flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-3 text-xs text-cream-40">
          <button type="button" onClick={onResend} disabled={resending} className="hover:text-gold">
            {resending ? "Resending..." : "Resend code"}
          </button>
          <span>·</span>
          <button type="button" onClick={onEditEmail} className="hover:text-gold">
            Edit email
          </button>
        </div>
        <Button type="submit" size="lg" disabled={submitting || otp.length !== 6}>
          {submitting ? "Verifying..." : "Verify email"}
        </Button>
      </div>
      {info && (
        <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          {info}
        </p>
      )}
      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function FullFormStage({
  name,
  email,
  referralCode,
  verificationToken,
  onEditEmail,
  onSubmitted,
}: {
  name: string;
  email: string;
  referralCode: string;
  verificationToken: string;
  onEditEmail: () => void;
  onSubmitted: (message?: string) => void;
}) {
  const [schoolOptions, setSchoolOptions] = useState<SchoolOption[]>([]);
  const [schoolsLoaded, setSchoolsLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schoolPick, setSchoolPick] = useState<string>("");

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RequestInviteInput>({
    resolver: zodResolver(requestInviteSchema),
    defaultValues: {
      name,
      email,
      verificationToken,
      referralCode,
      studentName: "",
      studentAge: "",
      school: "",
      city: "",
      hearAbout: undefined as unknown as HearAbout,
      referralFrom: "",
      question: "",
    },
    mode: "onBlur",
  });

  useEffect(() => {
    fetch("/api/schools")
      .then((r) => r.json())
      .then((j: { ok: boolean; schools?: SchoolOption[] }) => {
        if (j.ok && j.schools) setSchoolOptions(j.schools);
      })
      .finally(() => setSchoolsLoaded(true));
  }, []);

  const hearAbout = watch("hearAbout");

  const onSchoolPick = (value: string) => {
    setSchoolPick(value);
    if (value === OTHER_SCHOOL) {
      setValue("school", "", { shouldValidate: false });
    } else {
      setValue("school", value, { shouldValidate: true });
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/request-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!json.ok) throw new Error(json.message ?? "Could not submit");
      onSubmitted(json.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      {/* Locked identity */}
      <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300">
              ✓ Email verified
            </p>
            <p className="mt-1 text-sm text-cream">
              {name} · <span className="text-cream-70">{email}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onEditEmail}
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream-40 hover:text-gold"
          >
            Edit
          </button>
        </div>
      </div>

      {/* Student details */}
      <section className="space-y-5">
        <h3 className="font-mono text-xs font-bold tracking-[0.25em] text-gold">STUDENT DETAILS</h3>
        <div className="grid gap-2">
          <Label htmlFor="studentName">Student&apos;s name</Label>
          <Input
            id="studentName"
            placeholder="Please enter the student's name"
            {...register("studentName")}
            aria-invalid={errors.studentName ? "true" : undefined}
          />
          {errors.studentName && <Err>{errors.studentName.message}</Err>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="studentAge">Student&apos;s age</Label>
          <Input
            id="studentAge"
            inputMode="numeric"
            maxLength={3}
            placeholder="e.g. 16"
            {...register("studentAge")}
            aria-invalid={errors.studentAge ? "true" : undefined}
          />
          {errors.studentAge && <Err>{errors.studentAge.message}</Err>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="school-pick">School or college</Label>
          <Select value={schoolPick} onValueChange={onSchoolPick}>
            <SelectTrigger id="school-pick" aria-invalid={errors.school ? "true" : undefined}>
              <SelectValue placeholder={schoolsLoaded ? "Choose one" : "Loading..."} />
            </SelectTrigger>
            <SelectContent>
              {schoolOptions.map((s) => (
                <SelectItem key={s.id} value={s.name}>
                  {s.name}
                </SelectItem>
              ))}
              <SelectItem value={OTHER_SCHOOL}>Other</SelectItem>
            </SelectContent>
          </Select>
          {schoolPick === OTHER_SCHOOL && (
            <Input
              placeholder="Type the school or college name"
              {...register("school")}
              aria-invalid={errors.school ? "true" : undefined}
            />
          )}
          {errors.school && <Err>{errors.school.message}</Err>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            autoComplete="address-level2"
            placeholder="Hyderabad"
            {...register("city")}
            aria-invalid={errors.city ? "true" : undefined}
          />
          {errors.city && <Err>{errors.city.message}</Err>}
        </div>
      </section>

      {/* A few more things */}
      <section className="space-y-5">
        <h3 className="font-mono text-xs font-bold tracking-[0.25em] text-gold">A FEW MORE THINGS</h3>
        <div className="grid gap-2">
          <Label htmlFor="hearAbout">How did you hear about us?</Label>
          <Controller
            control={control}
            name="hearAbout"
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger id="hearAbout" aria-invalid={errors.hearAbout ? "true" : undefined}>
                  <SelectValue placeholder="Choose one" />
                </SelectTrigger>
                <SelectContent>
                  {hearAboutValues.map((v) => (
                    <SelectItem key={v} value={v}>
                      {hearAboutLabels[v]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.hearAbout && <Err>{errors.hearAbout.message}</Err>}
        </div>
        {hearAbout === "referral" && (
          <div className="grid gap-2">
            <Label htmlFor="referralFrom">Who referred you?</Label>
            <Input
              id="referralFrom"
              placeholder="Their name"
              {...register("referralFrom")}
              aria-invalid={errors.referralFrom ? "true" : undefined}
            />
            {errors.referralFrom && <Err>{errors.referralFrom.message}</Err>}
          </div>
        )}
        <div className="grid gap-2">
          <Label htmlFor="question">A question you&apos;d like the panel to address (optional)</Label>
          <Textarea
            id="question"
            rows={4}
            placeholder="What's the one thing you'd want answered?"
            {...register("question")}
            aria-invalid={errors.question ? "true" : undefined}
          />
          {errors.question && <Err>{errors.question.message}</Err>}
        </div>
      </section>

      <input type="hidden" {...register("name")} />
      <input type="hidden" {...register("email")} />
      <input type="hidden" {...register("verificationToken")} />
      <input type="hidden" {...register("referralCode")} />

      <div className="flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-sans text-xs text-cream-40 sm:max-w-sm">{content.request.privacy}</p>
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Sending..." : "Request invitation"}
        </Button>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function Err({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p className="text-xs text-destructive" role="alert">
      {children}
    </p>
  );
}
