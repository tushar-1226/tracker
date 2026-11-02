import { z } from "zod";

// Trim before validating: phone keyboards often append a space after an email suggestion.
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email({ error: "Enter a valid email" })),
  password: z.string().min(1, { error: "Password is required" }),
});

export const signupSchema = z.object({
  name: z.string().trim().min(1, { error: "What should we call you?" }).max(50),
  email: z.string().trim().toLowerCase().pipe(z.email({ error: "Enter a valid email" })),
  password: z.string().min(8, { error: "At least 8 characters" }),
});

export type AuthFormState =
  | {
      errors?: Partial<Record<"name" | "email" | "password", string[]>>;
      message?: string;
      /** What the user typed, so a failed submit doesn't wipe the form. Never includes the password. */
      values?: { name?: string; email?: string };
    }
  | undefined;
