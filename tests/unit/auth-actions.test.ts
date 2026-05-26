/**
 * Tests for app/auth/actions.ts — signup, login, logout server actions.
 *
 * Mocks `@/lib/supabase/server` to avoid real network calls. Asserts on:
 *  - Zod validation (email + password rules)
 *  - Friendly PT-BR error translations
 *  - Successful "pending confirmation" path on signup
 *  - Sentry capture wired on login failures
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const signUpMock = vi.fn()
const signInMock = vi.fn()
const signOutMock = vi.fn()
const redirectMock = vi.fn(() => {
  throw new Error('NEXT_REDIRECT')
})
const captureMock = vi.fn(() => 'mock-event-id')

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        signUp: signUpMock,
        signInWithPassword: signInMock,
        signOut: signOutMock,
      },
    }),
}))

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}))

vi.mock('@/lib/observability/sentry', () => ({
  captureWithCorrelation: captureMock,
}))

beforeEach(() => {
  signUpMock.mockReset()
  signInMock.mockReset()
  signOutMock.mockReset()
  redirectMock.mockClear()
  captureMock.mockClear()
})

afterEach(() => {
  vi.resetModules()
})

describe('signupAction', () => {
  it('returns fieldErrors when email is missing', async () => {
    const { signupAction } = await import('@/app/auth/actions')
    const fd = new FormData()
    fd.set('password', 'longenoughpassword')
    const result = await signupAction(null, fd)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.fieldErrors?.email).toBeTruthy()
    }
  })

  it('returns fieldErrors when password is < 10 chars', async () => {
    const { signupAction } = await import('@/app/auth/actions')
    const fd = new FormData()
    fd.set('email', 'a@b.com')
    fd.set('password', 'short')
    const result = await signupAction(null, fd)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.fieldErrors?.password).toContain('10')
    }
  })

  it('returns pending-confirmation message on signup success without session', async () => {
    signUpMock.mockResolvedValue({
      data: { user: { id: 'u1' }, session: null },
      error: null,
    })
    const { signupAction } = await import('@/app/auth/actions')
    const fd = new FormData()
    fd.set('email', 'a@b.com')
    fd.set('password', 'longenoughpassword')
    const result = await signupAction(null, fd)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.message).toContain('confirmação')
    }
  })

  it('translates "user already registered" to PT-BR', async () => {
    signUpMock.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'User already registered' },
    })
    const { signupAction } = await import('@/app/auth/actions')
    const fd = new FormData()
    fd.set('email', 'a@b.com')
    fd.set('password', 'longenoughpassword')
    const result = await signupAction(null, fd)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('já está cadastrado')
    }
  })
})

describe('loginAction', () => {
  it('translates "invalid_credentials" to PT-BR', async () => {
    signInMock.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    })
    const { loginAction } = await import('@/app/auth/actions')
    const fd = new FormData()
    fd.set('email', 'a@b.com')
    fd.set('password', 'whatever')
    const result = await loginAction(null, fd)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/inválidos/i)
    }
  })

  it('captures Sentry event on login failure', async () => {
    signInMock.mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    const { loginAction } = await import('@/app/auth/actions')
    const fd = new FormData()
    fd.set('email', 'a@b.com')
    fd.set('password', 'whatever')
    await loginAction(null, fd)
    expect(captureMock).toHaveBeenCalledTimes(1)
  })

  it('redirects to / on successful login', async () => {
    signInMock.mockResolvedValue({ error: null })
    const { loginAction } = await import('@/app/auth/actions')
    const fd = new FormData()
    fd.set('email', 'a@b.com')
    fd.set('password', 'whatever')
    await expect(loginAction(null, fd)).rejects.toThrow(/NEXT_REDIRECT/)
    expect(redirectMock).toHaveBeenCalledWith('/')
  })
})

describe('logoutAction', () => {
  it('calls signOut + redirects to /login', async () => {
    signOutMock.mockResolvedValue({ error: null })
    const { logoutAction } = await import('@/app/auth/actions')
    await expect(logoutAction()).rejects.toThrow(/NEXT_REDIRECT/)
    expect(signOutMock).toHaveBeenCalled()
    expect(redirectMock).toHaveBeenCalledWith('/login')
  })
})
