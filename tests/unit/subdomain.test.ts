/**
 * Tests for lib/concurso/subdomain.ts
 *
 * Covers production hosts, Vercel preview hosts, localhost variants,
 * reserved subdomains, ports, IPs, and multi-level subdomains.
 */
import { describe, expect, it } from 'vitest'

import { RESERVED_SUBDOMAINS, resolveSubdomain } from '@/lib/concurso/subdomain'

describe('resolveSubdomain', () => {
  describe('production hosts', () => {
    it("returns 'tjsp' for tjsp.flashcards.com.br", () => {
      expect(resolveSubdomain('tjsp.flashcards.com.br')).toBe('tjsp')
    })

    it("returns 'pf' for pf.flashcards.com.br", () => {
      expect(resolveSubdomain('pf.flashcards.com.br')).toBe('pf')
    })

    it('returns null for apex flashcards.com.br', () => {
      expect(resolveSubdomain('flashcards.com.br')).toBeNull()
    })

    it('returns null for www.flashcards.com.br (reserved)', () => {
      expect(resolveSubdomain('www.flashcards.com.br')).toBeNull()
    })

    it('returns null for app.flashcards.com.br (reserved)', () => {
      expect(resolveSubdomain('app.flashcards.com.br')).toBeNull()
    })

    it('returns null for admin.flashcards.com.br (reserved)', () => {
      expect(resolveSubdomain('admin.flashcards.com.br')).toBeNull()
    })

    it('returns null for api.flashcards.com.br (reserved)', () => {
      expect(resolveSubdomain('api.flashcards.com.br')).toBeNull()
    })

    it('returns null for monitoring.flashcards.com.br (reserved, Sentry tunnel)', () => {
      expect(resolveSubdomain('monitoring.flashcards.com.br')).toBeNull()
    })

    it('returns leftmost label for multi-level subdomain', () => {
      // staging.tjsp.flashcards.com.br → 'staging' (would 404 since no concurso has that slug)
      expect(resolveSubdomain('staging.tjsp.flashcards.com.br')).toBe('staging')
    })
  })

  describe('Vercel preview deploys', () => {
    it('returns null for *.vercel.app', () => {
      expect(resolveSubdomain('flashcards-henna-eight.vercel.app')).toBeNull()
    })

    it('returns null for branch preview URLs', () => {
      expect(resolveSubdomain('flashcards-pr-42-rako56s-projects.vercel.app')).toBeNull()
    })
  })

  describe('local development', () => {
    it("returns dev default 'tjsp' for bare localhost", () => {
      expect(resolveSubdomain('localhost')).toBe('tjsp')
    })

    it('strips port from localhost:3000', () => {
      expect(resolveSubdomain('localhost:3000')).toBe('tjsp')
    })

    it("returns 'tjsp' for tjsp.localhost", () => {
      expect(resolveSubdomain('tjsp.localhost')).toBe('tjsp')
    })

    it("returns 'pf' for pf.localhost:3000 (with port)", () => {
      expect(resolveSubdomain('pf.localhost:3000')).toBe('pf')
    })

    it('honors custom dev default via options', () => {
      expect(resolveSubdomain('localhost', { devDefaultSlug: 'pf' })).toBe('pf')
    })

    it('returns null for reserved subdomain on localhost (www.localhost)', () => {
      expect(resolveSubdomain('www.localhost')).toBeNull()
    })

    it('returns null for 127.0.0.1', () => {
      expect(resolveSubdomain('127.0.0.1:3000')).toBeNull()
    })

    it('returns null for IPv4 addresses', () => {
      expect(resolveSubdomain('192.168.1.10')).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('returns null for empty host', () => {
      expect(resolveSubdomain('')).toBeNull()
    })

    it('returns null for foreign domain (no rootDomain match)', () => {
      expect(resolveSubdomain('attacker.com')).toBeNull()
    })

    it('honors custom rootDomain option', () => {
      expect(resolveSubdomain('tjsp.example.com', { rootDomain: 'example.com' })).toBe('tjsp')
    })

    it('is case-insensitive on hostname', () => {
      expect(resolveSubdomain('TJSP.FLASHCARDS.COM.BR')).toBe('tjsp')
    })
  })

  describe('RESERVED_SUBDOMAINS contract', () => {
    it('exports the canonical set', () => {
      expect(RESERVED_SUBDOMAINS).toBeInstanceOf(Set)
      expect(RESERVED_SUBDOMAINS.has('www')).toBe(true)
      expect(RESERVED_SUBDOMAINS.has('app')).toBe(true)
      expect(RESERVED_SUBDOMAINS.has('admin')).toBe(true)
      expect(RESERVED_SUBDOMAINS.has('api')).toBe(true)
      expect(RESERVED_SUBDOMAINS.has('monitoring')).toBe(true)
    })
  })

  describe('uncovered edge cases (coverage gaps)', () => {
    it('returns null for `.localhost` with empty slug', () => {
      // ".localhost" → slug=''; coalesces to null
      expect(resolveSubdomain('.localhost')).toBeNull()
    })

    it('respects RESERVED check on multi-level subdomain leftmost label', () => {
      // www.tjsp.flashcards.com.br → slug='www' (reserved) → null
      expect(resolveSubdomain('www.tjsp.flashcards.com.br')).toBeNull()
    })

    it('returns null when only "." precedes rootDomain (empty subdomain)', () => {
      // ".flashcards.com.br" → subdomain='' which split('.')→[''] → slug=''
      expect(resolveSubdomain('.flashcards.com.br')).toBeNull()
    })

    it('respects custom rootDomain even when concurso slug is multi-level', () => {
      expect(
        resolveSubdomain('tjsp.staging.example.com', { rootDomain: 'staging.example.com' }),
      ).toBe('tjsp')
    })
  })
})
