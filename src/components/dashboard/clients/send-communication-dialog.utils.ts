const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailAddress(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function resolveCcEmails(
  existingEmails: string[],
  pendingInput: string
): { ccEmails: string[]; invalidInput?: string } {
  const trimmedInput = pendingInput.trim();

  if (!trimmedInput) {
    return { ccEmails: existingEmails };
  }

  if (!isValidEmailAddress(trimmedInput)) {
    return {
      ccEmails: existingEmails,
      invalidInput: trimmedInput,
    };
  }

  const existingLookup = new Set(existingEmails.map((email) => email.toLowerCase()));
  if (existingLookup.has(trimmedInput.toLowerCase())) {
    return { ccEmails: existingEmails };
  }

  return {
    ccEmails: [...existingEmails, trimmedInput],
  };
}
