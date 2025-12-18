export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmailFormat(email: string) {
  const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  return emailRegex.test(email.trim());
}
