"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { requestInviteSchema, type RequestInviteFormValues } from "@/lib/validations";
import { content } from "@/lib/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function RequestInviteForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestInviteFormValues>({
    resolver: zodResolver(requestInviteSchema),
    defaultValues: { name: "", email: "", city: "", reason: "" },
    mode: "onBlur",
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/request-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!json.ok) throw new Error(json.message ?? "Could not submit");
      if (json.message) setInfo(json.message);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  });

  if (submitted) {
    const { success } = content.request;
    return (
      <div className="space-y-6">
        <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">
          {success.label}
        </p>
        <h2 className="font-heading text-3xl font-bold leading-tight text-cream md:text-4xl text-balance">
          {success.title}
        </h2>
        <p className="max-w-lg font-sans text-base text-cream-70 md:text-lg">
          {info ?? success.body}
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-sans text-sm text-cream-70 hover:text-gold transition-colors"
        >
          ← {success.backLink}
        </Link>
      </div>
    );
  }

  const f = content.request.fields;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Field
        id="name"
        label={f.name.label}
        placeholder={f.name.placeholder}
        autoComplete="name"
        register={register("name")}
        error={errors.name?.message}
      />
      <Field
        id="email"
        label={f.email.label}
        placeholder={f.email.placeholder}
        type="email"
        autoComplete="email"
        register={register("email")}
        error={errors.email?.message}
      />
      <Field
        id="city"
        label={f.city.label}
        placeholder={f.city.placeholder}
        autoComplete="address-level2"
        register={register("city")}
        error={errors.city?.message}
      />
      <div className="grid gap-2">
        <Label htmlFor="reason">{f.reason.label}</Label>
        <Textarea
          id="reason"
          rows={4}
          placeholder={f.reason.placeholder}
          {...register("reason")}
          aria-invalid={errors.reason ? "true" : undefined}
        />
        {errors.reason?.message && (
          <p className="text-xs text-destructive" role="alert">
            {errors.reason.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-sans text-xs text-cream-40 sm:max-w-sm">
          {content.request.privacy}
        </p>
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? content.request.submitting : content.request.submit}
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

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  register: ReturnType<ReturnType<typeof useForm<RequestInviteFormValues>>["register"]>;
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
