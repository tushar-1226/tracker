import { z } from "zod";

export const loginSchema = z.object({
  email: z.email({ error: "Enter a valid email" }).trim().toLowerCase(),
  password: z.string().min(1, { error: "Password is required" }),
});

export const signupSchema = z.object({
  name: z.string().trim().min(1, { error: "What should we call you?" }).max(50),
  email: z.email({ error: "Enter a valid email" }).trim().toLowerCase(),
  password: z.string().min(8, { error: "At least 8 characters" }),
});

export type AuthFormState =
  | {
      errors?: Partial<Record<"name" | "email" | "password", string[]>>;
      message?: string;
    }
  | undefined;
