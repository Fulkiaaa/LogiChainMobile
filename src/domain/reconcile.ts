/**
 * Corps d'erreur de l'API : le middleware d'erreur sérialise toute `AppError`
 * en `{error: {code, message, details?}}`. Le nom de la règle métier violée
 * vit donc dans `details.rule`, jamais dans `error` lui-même.
 */
export type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: {rule?: string};
  };
};

export type ApiOutcome = { httpStatus: number; body?: ApiErrorBody };

export type ReconcileDecision = 'success' | 'conflict' | 'retry';

/** Règle métier nommée par l'API (`BusinessRuleError`), si le corps en porte une. */
function ruleOf(body: ApiOutcome['body']): string | undefined {
  return body?.error?.details?.rule;
}

export function decideReconcile(o: ApiOutcome): ReconcileDecision {
  if (o.httpStatus >= 200 && o.httpStatus < 300) return 'success';
  if (o.httpStatus === 409) return 'conflict';
  // Un 422 « transition interdite » signifie que le serveur détient un état
  // que l'action ne peut plus atteindre : réessayer ne le fera jamais passer.
  // C'est un conflit à arbitrer, pas un échec réseau.
  if (o.httpStatus === 422 && ruleOf(o.body) === 'item.invalid_transition') return 'conflict';
  return 'retry';
}
