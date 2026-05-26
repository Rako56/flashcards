// PROBE FILE — intentionally failing test (test gate).
// Will be deleted after probe completes.

import { describe, expect, it } from 'vitest';

describe('probe gate-break', () => {
  it('this test FAILS on purpose to prove CI test gate works', () => {
    expect(1 + 1).toBe(3);
  });
});
