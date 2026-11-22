"use client";

import { useState, useTransition } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAdminPassword } from "./actions";

export default function SettingsPage() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const res = await updateAdminPassword(formData);
      if (res.ok) {
        setMessage({ type: "success", text: "Mot de passe mis à jour avec succès." });
        event.currentTarget.reset();
      } else {
        setMessage({ type: "error", text: res.error });
      }
    });
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <PageHeader
        title="Paramètres"
        description="Gérez les informations de connexion et la sécurité de votre compte administrateur."
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Lock className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Sécurité du compte</CardTitle>
              <CardDescription>Modifier le mot de passe de l&apos;administrateur</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {message && (
              <div
                className={`rounded-lg p-3 text-sm font-medium ${
                  message.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="currentPassword">Mot de passe actuel</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                required
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nouveau mot de passe</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                placeholder="••••••••"
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">Minimum 6 caractères.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                placeholder="••••••••"
              />
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={isPending}>
                <ShieldCheck className="mr-2 size-4" />
                {isPending ? "Enregistrement..." : "Mettre à jour le mot de passe"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
