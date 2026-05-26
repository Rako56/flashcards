/**
 * Tests for lib/validation/cpf.ts — pure validator, no I/O.
 */
import { describe, expect, it } from 'vitest'

import { formatCpf, isValidCpf, normalizeCpf } from '@/lib/validation/cpf'

describe('normalizeCpf', () => {
  it('strips dots and dashes', () => {
    expect(normalizeCpf('123.456.789-09')).toBe('12345678909')
  })

  it('handles empty input', () => {
    expect(normalizeCpf('')).toBe('')
  })

  it('strips all non-digits including spaces and letters', () => {
    expect(normalizeCpf('  abc 123.456.789 - 09  ')).toBe('12345678909')
  })
})

describe('formatCpf', () => {
  it('formats an 11-digit string', () => {
    expect(formatCpf('12345678909')).toBe('123.456.789-09')
  })

  it('returns input unchanged when not 11 digits', () => {
    expect(formatCpf('123')).toBe('123')
  })

  it('handles pre-formatted input by re-formatting', () => {
    expect(formatCpf('123.456.789-09')).toBe('123.456.789-09')
  })
})

describe('isValidCpf', () => {
  it('accepts a known-good CPF (clean digits)', () => {
    // 111.444.777-35 is a canonical valid test CPF
    expect(isValidCpf('11144477735')).toBe(true)
  })

  it('accepts a known-good CPF (with separators)', () => {
    expect(isValidCpf('111.444.777-35')).toBe(true)
  })

  it('rejects wrong checksum digits', () => {
    expect(isValidCpf('11144477700')).toBe(false)
  })

  it('rejects too-short input', () => {
    expect(isValidCpf('123')).toBe(false)
  })

  it('rejects too-long input', () => {
    expect(isValidCpf('123456789012')).toBe(false)
  })

  it('rejects all-zeros pattern', () => {
    expect(isValidCpf('00000000000')).toBe(false)
  })

  it('rejects all-same-digit patterns', () => {
    expect(isValidCpf('11111111111')).toBe(false)
    expect(isValidCpf('22222222222')).toBe(false)
    expect(isValidCpf('99999999999')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidCpf('')).toBe(false)
  })

  it('rejects letters/garbage', () => {
    expect(isValidCpf('abc.def.ghi-jk')).toBe(false)
  })

  it('accepts another known valid CPF', () => {
    // 529.982.247-25 — common test fixture
    expect(isValidCpf('52998224725')).toBe(true)
    expect(isValidCpf('529.982.247-25')).toBe(true)
  })
})
