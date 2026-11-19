import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";

/**
 * Toutes les routes sont protégées par défaut, sauf /login et les routes
 * d'authentification. La logique d'autorisation vit dans src/auth.config.ts.
 */
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
