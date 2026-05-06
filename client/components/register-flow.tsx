"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registrationSchema, type RegistrationFormValues } from "@/lib/validations";
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
import { cn } from "@/lib/utils";

interface RegisterFlowProps {
  token: string;
  email: string;
  name?: string;
  initialPhase: "form" | "otp";
}

export function RegisterFlow({ token, email, name, initialPhase }: RegisterFlowProps) {
  const [phase, setPhase] = useState<"form" | "otp">(initialPhase);

  if (phase === "otp") {
    return <OtpStep token={token} email={email} />;
  }
  return <FormStep token={token} name={name} onSent={() => setPhase("otp")} />;
}

/* ─────────────────── form step ─────────────────── */

function FormStep({
  token,
  name,
  onSent,
}: {
  token: string;
  name?: string;
  onSent: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      parentName: name ?? "",
      parentPhone: "",
      studentName: "",
      studentAge: "",
      school: "",
      city: "",
      referral: "",
      question: "",
    },
    mode: "onBlur",
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, data: values }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!json.ok) throw new Error(json.message ?? "Could not submit");
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  });

  const f = content.form.fields;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-10">
      <FieldGroup title={content.form.sectionLabels.parent}>
        <Field
          id="parentName"
          label={f.parentName.label}
          placeholder={f.parentName.placeholder}
          autoComplete="name"
          register={register("parentName")}
          error={errors.parentName?.message}
        />
        <Field
          id="parentPhone"
          label={f.parentPhone.label}
          placeholder={f.parentPhone.placeholder}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          register={register("parentPhone")}
          error={errors.parentPhone?.message}
        />
      </FieldGroup>

      <FieldGroup title={content.form.sectionLabels.student}>
        <div className="grid gap-5 md:grid-cols-[1fr_140px]">
          <Field
            id="studentName"
            label={f.studentName.label}
            placeholder={f.studentName.placeholder}
            register={register("studentName")}
            error={errors.studentName?.message}
          />
          <SelectField
            id="studentAge"
            label={f.studentAge.label}
            placeholder={f.studentAge.placeholder}
            control={control}
            name="studentAge"
            options={content.form.studentAgeOptions.map((age) => ({ value: age, label: age }))}
            error={errors.studentAge?.message}
          />
        </div>
        <Field
          id="school"
          label={f.school.label}
          placeholder={f.school.placeholder}
          register={register("school")}
          error={errors.school?.message}
        />
        <Field
          id="city"
          label={f.city.label}
          placeholder={f.city.placeholder}
          autoComplete="address-level2"
          register={register("city")}
          error={errors.city?.message}
        />
      </FieldGroup>

      <FieldGroup title={content.form.sectionLabels.additional}>
        <SelectField
          id="referral"
          label={f.referral.label}
          placeholder={f.referral.placeholder}
          control={control}
          name="referral"
          options={content.form.referralOptions.map((opt) => ({ value: opt, label: opt }))}
          error={errors.referral?.message}
        />
        <div className="grid gap-2">
          <Label htmlFor="question">{f.question.label}</Label>
          <Textarea
            id="question"
            placeholder={f.question.placeholder}
            {...register("question")}
            aria-invalid={errors.question ? "true" : undefined}
          />
          {errors.question?.message && (
            <p className="text-xs text-destructive" role="alert">
              {errors.question.message}
            </p>
          )}
        </div>
      </FieldGroup>

      <div className="flex flex-col gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-sans text-xs text-cream-40 sm:max-w-sm">
          {content.form.privacyNote}
        </p>
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? content.form.submitting : content.form.submit}
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

/* ─────────────────── otp step ─────────────────── */

function OtpStep({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendNote, setResendNote] = useState<string | null>(null);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, otp }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!json.ok) throw new Error(json.message ?? "Could not verify");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    setResending(true);
    setResendNote(null);
    setError(null);
    try {
      const res = await fetch("/api/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!json.ok) throw new Error(json.message ?? "Could not resend");
      setResendNote("New code sent — check your inbox.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setResending(false);
    }
  };

  return (
    <form onSubmit={verify} className="space-y-8">
      <div>
        <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">
          {content.otp.label}
        </p>
        <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-cream md:text-4xl">
          {content.otp.title}
        </h2>
        <p className="mt-4 max-w-lg font-sans text-base text-cream-70">
          {content.otp.body.replace("{email}", email)}
        </p>
      </div>

      <div className="grid gap-2 max-w-xs">
        <Label htmlFor="otp">6-digit code</Label>
        <Input
          id="otp"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          autoComplete="one-time-code"
          autoFocus
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="font-mono text-2xl tracking-[0.4em]"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" disabled={submitting || otp.length !== 6}>
          {submitting ? content.otp.submitting : content.otp.submit}
        </Button>
        <Button type="button" variant="ghost" onClick={resend} disabled={resending}>
          {resending ? content.otp.resending : content.otp.resend}
        </Button>
      </div>

      {resendNote && <p className="text-sm text-cream-70">{resendNote}</p>}
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

/* ─────────────────── shared field helpers ─────────────────── */

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-5">
      <legend className="font-mono text-xs font-bold tracking-[0.25em] text-gold">
        {title}
      </legend>
      <div className="space-y-5">{children}</div>
    </fieldset>
  );
}

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  register: ReturnType<ReturnType<typeof useForm<RegistrationFormValues>>["register"]>;
  error?: string;
}

function Field({ id, label, register, error, className, ...rest }: FieldProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...register}
        {...rest}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface SelectFieldProps {
  id: string;
  label: string;
  placeholder: string;
  control: ReturnType<typeof useForm<RegistrationFormValues>>["control"];
  name: keyof RegistrationFormValues;
  options: { value: string; label: string }[];
  error?: string;
}

function SelectField({
  id,
  label,
  placeholder,
  control,
  name,
  options,
  error,
}: SelectFieldProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select onValueChange={field.onChange} value={field.value as string}>
            <SelectTrigger
              id={id}
              aria-invalid={error ? "true" : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
