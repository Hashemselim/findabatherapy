type SupabaseErrorLike = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

const INTERNAL_DATABASE_ERROR_PATTERNS = [
  /row-level security/i,
  /permission denied/i,
  /violates .* policy/i,
  /violates .* constraint/i,
  /duplicate key/i,
  /foreign key/i,
  /not-null/i,
  /relation .* does not exist/i,
  /column .* does not exist/i,
];

function isSupabaseErrorLike(error: unknown): error is SupabaseErrorLike {
  return !!error && typeof error === "object";
}

export function isInternalDatabaseError(error: unknown): boolean {
  if (!isSupabaseErrorLike(error)) {
    return false;
  }

  if (error.code === "42501") {
    return true;
  }

  const combined = [error.message, error.details, error.hint].filter(Boolean).join(" ");
  return INTERNAL_DATABASE_ERROR_PATTERNS.some((pattern) => pattern.test(combined));
}

export function toUserFacingSupabaseError(params: {
  action: string;
  error: unknown;
  fallback: string;
}): string {
  console.error(`[${params.action}]`, params.error);

  if (!isSupabaseErrorLike(params.error) || !params.error.message) {
    return params.fallback;
  }

  if (isInternalDatabaseError(params.error)) {
    return params.fallback;
  }

  return params.error.message;
}
