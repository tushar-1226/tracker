"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { Magnetic } from "@/components/motion/magnetic";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, signup } from "@/server/actions/auth";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action, pending] = useActionState(mode === "login" ? login : signup, undefined);
  const errors = state?.errors;

  return (
    <Stagger className="w-full max-w-sm">
      <StaggerItem>
        <p className="mb-10 text-xl font-semibold tracking-tight lg:hidden">
          track<span className="text-muted">.</span>
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          {mode === "login" ? "Welcome back." : "Let’s set you up."}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {mode === "login"
            ? "Log in to keep your streaks alive."
            : "Create your private account. Only you will use this tracker."}
        </p>
      </StaggerItem>

      <form action={action} className="mt-10 space-y-5" noValidate>
        {mode === "signup" && (
          <StaggerItem>
            <Field id="name" label="Name" error={errors?.name?.[0]}>
              <Input id="name" name="name" autoComplete="name" placeholder="Your name" aria-invalid={!!errors?.name} />
            </Field>
          </StaggerItem>
        )}
        <StaggerItem>
          <Field id="email" label="Email" error={errors?.email?.[0]}>
            <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" aria-invalid={!!errors?.email} />
          </Field>
        </StaggerItem>
        <StaggerItem>
          <Field id="password" label="Password" error={errors?.password?.[0]}>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="••••••••"
              aria-invalid={!!errors?.password}
            />
          </Field>
        </StaggerItem>

        {state?.message && (
          <p role="alert" className="rounded-xl bg-foreground/[0.035] px-4 py-3 text-sm">
            {state.message}
          </p>
        )}

        <StaggerItem className="pt-2">
          <Magnetic className="w-full">
            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              {pending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Log in" : "Create account"}
                  <ArrowRight />
                </>
              )}
            </Button>
          </Magnetic>
        </StaggerItem>
      </form>
    </Stagger>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs text-muted">— {error}</p>}
    </div>
  );
}
