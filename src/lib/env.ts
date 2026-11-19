import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL est requis."),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET doit contenir au moins 16 caractères."),
  ADMIN_EMAIL: z.email("ADMIN_EMAIL doit être une adresse e-mail valide.").optional(),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
});
