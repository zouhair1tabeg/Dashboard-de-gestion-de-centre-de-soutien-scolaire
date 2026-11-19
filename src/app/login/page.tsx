import { Check, GraduationCap } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Connexion",
};

// La page dépend de la session pour rediriger un administrateur déjà connecté.
export const instant = false;

const highlights = [
  "Élèves, groupes et inscriptions",
  "Planning et suivi des présences",
  "Paiements mensuels en espèces",
];

export default async function LoginPage() {
  await connection();

  const session = await auth();

  if (session?.user) {
    redirect("/");
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[oklch(0.36_0.07_195)] to-[oklch(0.24_0.04_215)] p-12 text-white lg:flex">
        <div className="absolute -top-32 -left-24 size-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute right-0 -bottom-40 size-[28rem] rounded-full bg-white/5 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
            <GraduationCap className="size-6" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">Centre Prime</p>
            <p className="text-xs text-white/60">Soutien scolaire</p>
          </div>
        </div>

        <div className="relative max-w-md space-y-6">
          <h1 className="text-3xl leading-tight font-semibold tracking-tight text-balance">
            Toute la gestion de votre centre, au même endroit.
          </h1>
          <ul className="space-y-3">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-white/75">
                <span className="flex size-5 items-center justify-center rounded-full bg-white/10">
                  <Check className="size-3" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">Centre Prime · Gestion du centre</p>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex items-center gap-3 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="size-5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight">Centre Prime</p>
              <p className="text-xs text-muted-foreground">Soutien scolaire</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">Connexion</h2>
            <p className="text-sm text-muted-foreground">
              Accédez à votre espace administrateur pour gérer le centre.
            </p>
          </div>

          <LoginForm />

          <p className="text-center text-xs text-muted-foreground/70">
            © {new Date().getFullYear()} Centre Prime
          </p>
        </div>
      </section>
    </div>
  );
}
