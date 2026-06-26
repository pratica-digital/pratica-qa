export function getPasswordPolicyError(password: string) {
  if (password.length < 8) {
    return 'Use pelo menos 8 caracteres.';
  }

  if (!/[a-z]/.test(password)) {
    return 'Use pelo menos uma letra minúscula.';
  }

  if (!/[A-Z]/.test(password)) {
    return 'Use pelo menos uma letra maiúscula.';
  }

  if (!/\d/.test(password)) {
    return 'Use pelo menos um número.';
  }

  return '';
}
