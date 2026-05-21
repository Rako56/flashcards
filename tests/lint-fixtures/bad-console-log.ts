// INTENTIONALLY BROKEN — proves no-console fires for console.log (warn/error allowed)
// DO NOT FIX. Used by Plan 1.4 + 1.10 gate-break tests.
export function broken(): void {
  console.log('this should fail lint')
}
