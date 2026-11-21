"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

const UNAUTHORIZED_MESSAGE = "Votre session a expiré. Veuillez vous reconnecter.";

export type PasswordActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateAdminPassword(formData: FormData): Promise<PasswordActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, error: UNAUTHORIZED_MESSAGE };
  }

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { ok: false, error: "Tous les champs sont obligatoires." };
  }

  if (newPassword.length < 6) {
    return { ok: false, error: "Le nouveau mot de passe doit contenir au moins 6 caractères." };
  }

  if (newPassword !== confirmPassword) {
    return { ok: false, error: "Les nouveaux mots de passe ne correspondent pas." };
  }

  try {
    // Récupérer l'admin unique
    const admin = await prisma.user.findFirst();
    if (!admin) {
      return { ok: false, error: "Utilisateur administrateur introuvable." };
    }

    const isValid = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!isValid) {
      return { ok: false, error: "Le mot de passe actuel est incorrect." };
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: admin.id },
      data: { passwordHash },
    });

    revalidatePath("/settings");
    return { ok: true };
  } catch (error) {
    console.error("Erreur mise à jour mot de passe:", error);
    return { ok: false, error: "Une erreur est survenue lors de la mise à jour." };
  }
}
