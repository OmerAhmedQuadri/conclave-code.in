"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  registerSubmitSchema,
  type RegisterSubmitInput,
} from "@/models/register";
import { hearAboutValues, type HearAbout } from "@/models/request-invite";
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

interface RegisterFlowProps {
  token: string;
  email: string;
  name?: string;
}

type Stage = "accept" | "otp" | "form";

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

export function RegisterFlow({ token, email: initialEmail, name: invitedName }: RegisterFlowProps) {
  const [stage, setStage] = useState<Stage>("accept");
  const [email, setEmail] = useState(initialEmail);
  const [name, setName] = useState(invitedName ?? "");
  const [verificationToken, setVerificationToken] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {stage === "accept" && (
        <AcceptStage
          token={token}
          name={name}
          setName={setName}
          email={email}
          setEmail={setEmail}
          originalEmail={initialEmail}
          onSent={() => setStage("otp")}
        />
      )}

      {stage === "otp" && (
        <OtpStage
          token={token}
          email={email}
          onVerified={(t) => {
            setVerificationToken(t);
            setStage("form");
          }}
          onEditEmail={() => setStage("accept")}
        />
      )}

      {stage === "form" && verificationToken && (
        <FullFormStage
          token={token}
          name={name}
          email={email}
          verificationToken={verificationToken}
          onEditEmail={() => {
            setVerificationToken(null);
            setStage("accept");
          }}
        />
      )}
    </div>
  );
}

function AcceptStage({
  token,
  name,
  setName,
  email,
  setEmail,
  originalEmail,
  onSent,
}: {
  token: string;
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  originalEmail: string;
  onSent: () => void;
}) {
  const [editingEmail, setEditingEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/register/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email }),
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
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <div>
        <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">YOU&apos;RE INVITED</p>
        <p className="mt-2 text-sm text-cream-70">
          Confirm your email to accept your invitation. We&apos;ll send a 6-digit code so we know it&apos;s you.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="name">Your name</Label>
        <Input
          id="name"
          required
          minLength={2}
          maxLength={80}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="As you'd like us to address you"
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="email">Email</Label>
          {!editingEmail ? (
            <button
              type="button"
              onClick={() => setEditingEmail(true)}
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream-40 hover:text-gold"
            >
              Use another email
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEmail(originalEmail);
                setEditingEmail(false);
              }}
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream-40 hover:text-gold"
            >
              Use original ({originalEmail})
            </button>
          )}
        </div>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          readOnly={!editingEmail}
          className={cn(!editingEmail && "cursor-not-allowed text-cream-70")}
        />
      </div>

      <div className="flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-sans text-xs text-cream-40 sm:max-w-sm">
          A 6-digit code will be sent to {email}.
        </p>
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Sending..." : "Accept invitation"}
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

function OtpStage({
  token,
  email,
  onVerified,
  onEditEmail,
}: {
  token: string;
  email: string;
  onVerified: (vt: string) => void;
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
      const res = await fetch("/api/register/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, otp }),
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
      const res = await fetch("/api/register/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email }),
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
  token,
  name,
  email,
  verificationToken,
  onEditEmail,
}: {
  token: string;
  name: string;
  email: string;
  verificationToken: string;
  onEditEmail: () => void;
}) {
  const router = useRouter();
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
  } = useForm<RegisterSubmitInput>({
    resolver: zodResolver(registerSubmitSchema),
    defaultValues: {
      token,
      name,
      email,
      verificationToken,
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
    if (value === OTHER_SCHOOL) setValue("school", "", { shouldValidate: false });
    else setValue("school", value, { shouldValidate: true });
  };

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!json.ok) throw new Error(json.message ?? "Could not submit");
      // Stay logged in: save the session so the home-page status checker
      // picks them up automatically the next time they visit.
      saveStatusSession(values.email.trim().toLowerCase(), values.verificationToken);
      router.refresh();
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

      <input type="hidden" {...register("token")} />
      <input type="hidden" {...register("name")} />
      <input type="hidden" {...register("email")} />
      <input type="hidden" {...register("verificationToken")} />

      <div className="flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-sans text-xs text-cream-40 sm:max-w-sm">
          We&apos;ll only contact you about this event. No marketing, no third parties.
        </p>
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit registration"}
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
