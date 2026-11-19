import { auth } from "@/auth";

/** Vérifie qu'une session administrateur est active pour une Server Action. */
export async function requireAdmin(): Promise<boolean> {
  const session = await auth();

  return Boolean(session?.user);
}
