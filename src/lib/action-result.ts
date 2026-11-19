import { z } from "zod";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function actionError(error: string, fieldErrors?: Record<string, string[]>): ActionResult {
  return { ok: false, error, fieldErrors };
}

export function validationError(error: z.ZodError): ActionResult {
  const flattened = z.flattenError(error);
  const fieldErrors: Record<string, string[]> = {};
  const entries = Object.entries(
    flattened.fieldErrors as Record<string, string[] | undefined>,
  );

  for (const [field, messages] of entries) {
    if (messages && messages.length > 0) {
      fieldErrors[field] = messages;
    }
  }

  return {
    ok: false,
    error: "Veuillez corriger les champs indiqués.",
    ...(Object.keys(fieldErrors).length > 0 ? { fieldErrors } : {}),
  };
}

export function unexpectedError(error: unknown): ActionResult {
  console.error(error);

  return actionError("Une erreur inattendue est survenue. Veuillez réessayer.");
}
