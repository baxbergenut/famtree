"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { login, register, type AuthMode } from "@/lib/api";

type AuthCardProps = {
  mode: AuthMode;
  eyebrow: string;
  title: string;
  description: string;
  submitLabel: string;
  alternateHref: string;
  alternateLabel: string;
  alternateText: string;
};

export function AuthCard({
  mode,
  eyebrow,
  title,
  description,
  submitLabel,
  alternateHref,
  alternateLabel,
  alternateText,
}: AuthCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const isRegister = mode === "register";
  const helperText = useMemo(() => {
    if (!isRegister) {
      return "Use the account you already created for your tree.";
    }

    return "We’ll create your private tree and place you at the center.";
  }, [isRegister]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setFormValues((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        if (isRegister) {
          await register({
            firstName: formValues.firstName,
            lastName: formValues.lastName,
            email: formValues.email,
            password: formValues.password,
          });
        } else {
          await login({
            email: formValues.email,
            password: formValues.password,
          });
        }

        router.push("/app");
        router.refresh();
      } catch (submitError) {
        const message =
          submitError instanceof Error
            ? submitError.message
            : "Something went wrong. Please try again.";

        setError(message);
      }
    });
  }

  return (
    <section className="w-full max-w-md rounded-[32px] border border-[var(--line-soft)] bg-white/82 p-8 shadow-[0_24px_90px_rgba(31,27,24,0.12)] backdrop-blur">
      <p className="text-xs font-semibold tracking-[0.22em] text-[var(--accent-strong)] uppercase">
        {eyebrow}
      </p>
      <h1 className="mt-4 font-serif-display text-4xl text-[var(--ink-strong)]">
        {title}
      </h1>
      <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
        {description}
      </p>
      <p className="mt-4 text-xs leading-6 text-[var(--ink-soft)]">
        {helperText}
      </p>
      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        {isRegister ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                Name
              </span>
              <input
                name="firstName"
                value={formValues.firstName}
                onChange={handleChange}
                type="text"
                placeholder="Avery"
                className="w-full rounded-2xl border border-[var(--line-soft)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--ink-strong)] outline-none transition focus:border-[var(--accent-strong)]"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                Last name
              </span>
              <input
                name="lastName"
                value={formValues.lastName}
                onChange={handleChange}
                type="text"
                placeholder="Optional"
                className="w-full rounded-2xl border border-[var(--line-soft)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--ink-strong)] outline-none transition focus:border-[var(--accent-strong)]"
              />
            </label>
          </div>
        ) : null}
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
            Email
          </span>
          <input
            name="email"
            value={formValues.email}
            onChange={handleChange}
            type="email"
            placeholder="you@example.com"
            className="w-full rounded-2xl border border-[var(--line-soft)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--ink-strong)] outline-none transition focus:border-[var(--accent-strong)]"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
            Password
          </span>
          <input
            name="password"
            value={formValues.password}
            onChange={handleChange}
            type="password"
            placeholder={
              isRegister ? "At least 8 characters" : "Enter your password"
            }
            className="w-full rounded-2xl border border-[var(--line-soft)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--ink-strong)] outline-none transition focus:border-[var(--accent-strong)]"
          />
        </label>
        {error ? (
          <p className="rounded-2xl border border-[#d8b5a5] bg-[#fff1ec] px-4 py-3 text-sm text-[#8f4226]">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-[var(--ink-strong)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2c2520] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "Please wait..." : submitLabel}
        </button>
      </form>
      <p className="mt-6 text-sm text-[var(--ink-soft)]">
        {alternateText}{" "}
        <Link
          href={alternateHref}
          className="font-semibold text-[var(--accent-strong)]"
        >
          {alternateLabel}
        </Link>
      </p>
    </section>
  );
}
