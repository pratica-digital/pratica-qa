export const TEST_RUN_NAME_MAX_LENGTH = 160;

export function normalizeTestRunName(value: string) {
  return value.trim();
}

export function validateTestRunName(value: string) {
  const normalizedName = normalizeTestRunName(value);

  if (!normalizedName) {
    return 'O nome do Test Run é obrigatório.';
  }

  if (normalizedName.length > TEST_RUN_NAME_MAX_LENGTH) {
    return `O nome deve ter no máximo ${TEST_RUN_NAME_MAX_LENGTH} caracteres.`;
  }

  return '';
}
