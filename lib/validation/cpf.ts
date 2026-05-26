/**
 * Brazilian CPF validation.
 *
 * CPF is an 11-digit ID with 2 checksum digits computed from the first 9.
 * This validator strips non-digit characters before checking format and
 * checksum, so users can paste with or without separators.
 *
 * Reference: Receita Federal algorithm (https://www.gov.br/receitafederal).
 *
 * Pure function — no I/O, no Supabase. Used by the onboarding form
 * client-side AND the Server Action server-side (defense in depth).
 */

const BLOCK_LIST = new Set([
  '00000000000',
  '11111111111',
  '22222222222',
  '33333333333',
  '44444444444',
  '55555555555',
  '66666666666',
  '77777777777',
  '88888888888',
  '99999999999',
])

export function normalizeCpf(raw: string): string {
  return raw.replace(/\D/g, '')
}

export function formatCpf(digits: string): string {
  const clean = normalizeCpf(digits)
  if (clean.length !== 11) return digits
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`
}

/**
 * Returns true iff `raw` (with or without separators) is a valid CPF.
 *
 * Steps:
 *   1. Strip non-digits.
 *   2. Reject anything other than 11 digits.
 *   3. Reject all-same-digit patterns (000.. through 999..).
 *   4. Compute the first checksum digit (sum of digits 0..8 × weight 10..2,
 *      then 11 - sum%11; if result ≥ 10, becomes 0).
 *   5. Compute the second checksum digit (sum of digits 0..9 × weight 11..2,
 *      same rule).
 *   6. Compare with the actual 10th + 11th digits.
 */
export function isValidCpf(raw: string): boolean {
  const cpf = normalizeCpf(raw)
  if (cpf.length !== 11) return false
  if (BLOCK_LIST.has(cpf)) return false

  const digits = cpf.split('').map((c) => Number(c))

  // First check digit: weights 10..2 against positions 0..8
  let sum = 0
  for (let i = 0; i < 9; i += 1) {
    sum += (digits[i] ?? 0) * (10 - i)
  }
  let check = 11 - (sum % 11)
  if (check >= 10) check = 0
  if (check !== digits[9]) return false

  // Second check digit: weights 11..2 against positions 0..9
  sum = 0
  for (let i = 0; i < 10; i += 1) {
    sum += (digits[i] ?? 0) * (11 - i)
  }
  check = 11 - (sum % 11)
  if (check >= 10) check = 0
  return check === digits[10]
}
