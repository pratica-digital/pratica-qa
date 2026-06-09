export function getPasswordPolicyError(password: string) {
  if (password.length < 8) {
    return 'Use at least 8 characters.';
  }

  if (!/[a-z]/.test(password)) {
    return 'Use at least one lowercase letter.';
  }

  if (!/[A-Z]/.test(password)) {
    return 'Use at least one uppercase letter.';
  }

  if (!/\d/.test(password)) {
    return 'Use at least one number.';
  }

  return '';
}
