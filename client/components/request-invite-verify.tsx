"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  requestInviteSchema,
  hearAboutValues,
  type HearAbout,
  type RequestInviteInput,
  type RequesterRole,
} from "@/models/request-invite";
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
import {
  clearPendingDraft,
  loadPendingDraft,
  type PendingInviteDraft,
} from "@/lib/pending-invite-draft";
import { cn } from "@/lib/utils";

type Stage = "otp" | "role" | "form";

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

export function RequestInviteVerifyFlow() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [draft, setDraft] = useState<PendingInviteDraft | null>(null);
  const [stage, setStage] = useState<Stage>("otp");
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [role, setRole] = useState<RequesterRole | null>(null);

  // Load the draft (name, email, referralCode) saved on the home page.
  // If there is none, the user landed here directly — bounce back home.
  useEffect(() => {
    const d = loadPendingDraft();
    if (!d) {
      router.replace("/");
      return;
    }
    setDraft(d);
    setHydrated(true);
  }, [router]);

  if (!hydrated || !draft) {
    return (
      <p className="py-12 text-center font-mono text-xs uppercase tracking-[0.2em] text-cream-40">
        Loading...
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <StageIndicator stage={stage} />

      {stage === "otp" && (
        <OtpStage
          name={draft.name}
          email={draft.email}
          onVerified={(token) => {
            setVerificationToken(token);
            setStage("role");
          }}
          onEditEmail={() => {
            clearPendingDraft();
            router.replace("/");
          }}
        />
      )}

      {stage === "role" && verificationToken && (
        <RoleStage
          onPick={(r) => {
            setRole(r);
            setStage("form");
          }}
        />
      )}

      {stage === "form" && verificationToken && role && (
        <FullFormStage
          name={draft.name}
          email={draft.email}
          referralCode={draft.referralCode}
          role={role}
          verificationToken={verificationToken}
          onEditRole={() => setStage("role")}
          onEditEmail={() => {
            clearPendingDraft();
            router.replace("/");
          }}
          onSubmitted={() => {
            saveStatusSession(draft.email, verificationToken);
            clearPendingDraft();
            router.replace("/check-status");
          }}
        />
      )}
    </div>
  );
}

function StageIndicator({ stage }: { stage: Stage }) {
  const stageOrder: Stage[] = ["otp", "role", "form"];
  const currentIndex = stageOrder.indexOf(stage);
  const steps = [
    { label: "Verify email", done: true, active: false },
    { label: "Enter OTP", done: currentIndex > 0, active: stage === "otp" },
    { label: "Who are you?", done: currentIndex > 1, active: stage === "role" },
    { label: "Your details", done: false, active: stage === "form" },
  ];
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em]">
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full border text-[10px]",
              s.active && "border-gold bg-gold/15 text-gold",
              s.done && "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
              !s.active && !s.done && "border-border text-cream-40"
            )}
          >
            {s.done ? "✓" : i + 1}
          </span>
          <span
            className={cn(
              s.active
                ? "text-gold"
                : s.done
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-cream-40"
            )}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && <span className="text-cream-40">·</span>}
        </div>
      ))}
    </div>
  );
}

function RoleStage({ onPick }: { onPick: (r: RequesterRole) => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">ONE QUICK QUESTION</p>
        <h1 className="mt-3 text-balance font-heading text-3xl font-bold leading-tight text-cream md:text-4xl">
          Who&apos;s requesting the invite?
        </h1>
        <p className="mt-3 text-sm text-cream-70">
          We&apos;ll tailor the next step based on your answer.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onPick("student")}
          className="group flex flex-col gap-2 rounded-md border border-border bg-card p-6 text-left transition-colors hover:border-gold hover:bg-gold/5"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-cream-40 group-hover:text-gold">
            I am the
          </span>
          <span className="font-heading text-2xl font-bold text-cream">Student</span>
          <span className="text-sm text-cream-70">
            You&apos;ll fill in your own details on the next page.
          </span>
        </button>
        <button
          type="button"
          onClick={() => onPick("parent")}
          className="group flex flex-col gap-2 rounded-md border border-border bg-card p-6 text-left transition-colors hover:border-gold hover:bg-gold/5"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-cream-40 group-hover:text-gold">
            I am a
          </span>
          <span className="font-heading text-2xl font-bold text-cream">Parent</span>
          <span className="text-sm text-cream-70">
            You&apos;ll fill in your child&apos;s details on the next page.
          </span>
        </button>
      </div>
    </div>
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
      const json = (await res.json()) as {
        ok: boolean;
        verificationToken?: string;
        message?: string;
      };
      if (!json.ok || !json.verificationToken)
        throw new Error(json.message ?? "Could not verify");
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
      <div className="text-center">
        <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">CHECK YOUR INBOX</p>
        <h1 className="mt-3 text-balance font-heading text-3xl font-bold leading-tight text-cream md:text-4xl">
          Enter your one-time code
        </h1>
        <p className="mt-3 text-sm text-cream-70">
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
          className="text-center font-mono text-2xl tracking-[0.5em]"
          autoFocus
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

function FullFormStage({
  name,
  email,
  referralCode,
  role,
  verificationToken,
  onEditEmail,
  onEditRole,
  onSubmitted,
}: {
  name: string;
  email: string;
  referralCode: string;
  role: RequesterRole;
  verificationToken: string;
  onEditEmail: () => void;
  onEditRole: () => void;
  onSubmitted: () => void;
}) {
  // Label set adapts to whether the user is the student themselves or a parent.
  const isStudent = role === "student";
  const labels = isStudent
    ? {
        section: "ABOUT YOU",
        nameLabel: "Your full name",
        namePlaceholder: "Your name",
        ageLabel: "Your age",
        agePlaceholder: "e.g. 17",
      }
    : {
        section: "STUDENT DETAILS",
        nameLabel: "Student's name",
        namePlaceholder: "Please enter the student's name",
        ageLabel: "Student's age",
        agePlaceholder: "e.g. 16",
      };
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
      role,
      // If the requester IS the student, pre-fill their name from stage 1
      studentName: isStudent ? name : "",
      studentAge: "",
      studentPhone: "",
      studentEmail: "",
      parentPhone: "",
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
    if (value === OTHER_SCHOOL) setValue("school", "", { shouldValidate: false });
    else setValue("school", value, { shouldValidate: true });
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
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      {/* Locked identity + role */}
      <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
              ✓ Email verified · {isStudent ? "Student" : "Parent"}
            </p>
            <p className="mt-1 text-sm text-cream">
              {name} · <span className="text-cream-70">{email}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={onEditRole}
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream-40 hover:text-gold"
            >
              Change role
            </button>
            <button
              type="button"
              onClick={onEditEmail}
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream-40 hover:text-gold"
            >
              Edit email
            </button>
          </div>
        </div>
      </div>

      {!isStudent && (
        <section className="space-y-5">
          <h3 className="font-mono text-xs font-bold tracking-[0.25em] text-gold">PARENT</h3>
          <div className="grid gap-2">
            <Label htmlFor="parentPhone">Your phone</Label>
            <Input
              id="parentPhone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+91 ..."
              {...register("parentPhone")}
              aria-invalid={errors.parentPhone ? "true" : undefined}
            />
            {errors.parentPhone && <Err>{errors.parentPhone.message}</Err>}
          </div>
        </section>
      )}

      <section className="space-y-5">
        <h3 className="font-mono text-xs font-bold tracking-[0.25em] text-gold">{labels.section}</h3>
        <div className="grid gap-2">
          <Label htmlFor="studentName">{labels.nameLabel}</Label>
          <Input
            id="studentName"
            placeholder={labels.namePlaceholder}
            {...register("studentName")}
            aria-invalid={errors.studentName ? "true" : undefined}
          />
          {errors.studentName && <Err>{errors.studentName.message}</Err>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="studentAge">{labels.ageLabel}</Label>
          <Input
            id="studentAge"
            inputMode="numeric"
            maxLength={3}
            placeholder={labels.agePlaceholder}
            {...register("studentAge")}
            aria-invalid={errors.studentAge ? "true" : undefined}
          />
          {errors.studentAge && <Err>{errors.studentAge.message}</Err>}
        </div>
        {!isStudent && (
          <div className="grid gap-2">
            <Label htmlFor="studentEmail">Student&apos;s email</Label>
            <Input
              id="studentEmail"
              type="email"
              placeholder="student@email.com"
              {...register("studentEmail")}
              aria-invalid={errors.studentEmail ? "true" : undefined}
            />
            {errors.studentEmail && <Err>{errors.studentEmail.message}</Err>}
          </div>
        )}
        <div className="grid gap-2">
          <Label htmlFor="studentPhone">{isStudent ? "Your phone" : "Student’s phone"}</Label>
          <Input
            id="studentPhone"
            type="tel"
            inputMode="tel"
            autoComplete={isStudent ? "tel" : undefined}
            placeholder="+91 ..."
            {...register("studentPhone")}
            aria-invalid={errors.studentPhone ? "true" : undefined}
          />
          {errors.studentPhone && <Err>{errors.studentPhone.message}</Err>}
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
      <input type="hidden" {...register("role")} />

      <div className="flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-sans text-xs text-cream-40 sm:max-w-sm">
          We&apos;ll only contact you about this event. No marketing, no third parties.
        </p>
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Sending..." : "Request invitation"}
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

function Err({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p className="text-xs text-destructive" role="alert">
      {children}
    </p>
  );
}
