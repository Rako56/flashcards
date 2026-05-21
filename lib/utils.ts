import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Conditional Tailwind class composer.
 *
 * Use `cn()` for ALL conditional Tailwind classes; never concatenate template
 * strings. `cn()` runs `clsx()` (conditional join) then `tailwind-merge`
 * (resolves conflicting utilities — later wins).
 *
 * @example
 *   cn('p-2', condition && 'p-4')    // -> 'p-4' if condition
 *   cn('text-red-500', 'text-blue-500') // -> 'text-blue-500'
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
