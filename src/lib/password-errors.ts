export const MIN_PASSWORD_LENGTH = 8;

/** English source keys (translated via recovery.json) explaining why a password update failed. */
export function passwordUpdateErrorMessage(error: { message?: string; code?: string } | null | undefined): string {
  const text = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  if (text.includes("weak") || text.includes("easy to guess") || text.includes("pwned") || text.includes("leaked")) {
    return "This password is too common and easy to guess. Choose a different one (for example your name with numbers).";
  }
  if (text.includes("same") && text.includes("password")) {
    return "The new password must be different from your old password.";
  }
  if (text.includes("at least") || text.includes("characters") || text.includes("length")) {
    return "Password must be at least 8 letters or digits";
  }
  if (text.includes("session") || text.includes("jwt") || text.includes("expired") || text.includes("not authenticated")) {
    return "Your verification has expired. Please request a new code and try again.";
  }
  return "Password update failed";
}
