// PROBE FILE — intentionally violates ALL gates.
// Purpose: prove CI catches bad code. Will be deleted after probe completes.

// Violation 1: @typescript-eslint/no-explicit-any (lint gate)
export function badAny(x: any): any {
  return x;
}

// Violation 2: no-console (lint gate)
export function badConsole() {
  console.log('this should fail lint');
}

// Violation 3: type mismatch (typecheck gate)
export const badType: number = 'this is a string, not a number';

// Violation 4: bad formatting (format gate) — wrong indentation, missing semi
export    function badFormat(  )  {
return    42
}

// Violation 5: unused import (lint gate)
import { existsSync } from 'fs';
