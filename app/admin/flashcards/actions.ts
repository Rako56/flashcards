'use server'

/**
 * Admin write actions for admin_flashcards.
 *
 * Gated by `has_role('admin')` check (same as the read pages). RLS
 * enforces server-side too — service_role is NOT used here; we update
 * via the user-scoped server client and let RLS allow/deny.
 */
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { isAdmin } from '@/lib/access/is-admin'
import { childLogger } from '@/lib/observability/logger'
import { captureWithCorrelation } from '@/lib/observability/sentry'
import { createClient } from '@/lib/supabase/server'

const STATUS_ENUM = ['active', 'archived', 'draft', 'review'] as const

const ToggleSchema = z.object({
  cardId: z.string().uuid('cardId must be a UUID'),
  nextStatus: z.enum(STATUS_ENUM),
})

export type ToggleCardResult = { ok: true } | { ok: false; error: string }

export async function toggleCardStatusAction(input: {
  cardId: string
  nextStatus: string
}): Promise<ToggleCardResult> {
  const correlationId = crypto.randomUUID()
  const log = childLogger({ correlationId, action: 'toggleCardStatus', cardId: input.cardId })

  const parsed = ToggleSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Status inválido.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { ok: false, error: 'Sessão expirou.' }
  }

  const admin = await isAdmin(user.id)
  if (!admin) {
    log.warn('non-admin attempted card status toggle')
    return { ok: false, error: 'Acesso negado.' }
  }

  const { error: updateError } = await supabase
    .from('admin_flashcards')
    .update({ status: parsed.data.nextStatus })
    .eq('id', parsed.data.cardId)

  if (updateError) {
    captureWithCorrelation(updateError, correlationId, { stage: 'admin_flashcards.update' })
    log.error({ err: updateError.message }, 'update failed')
    return { ok: false, error: 'Não foi possível atualizar o card.' }
  }

  log.info({ nextStatus: parsed.data.nextStatus }, 'card status updated')
  revalidatePath('/admin/flashcards')
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Full text edit — used when a law changes/is revoked and the card content
// needs correction (not just a status flip).
// ---------------------------------------------------------------------------

const DIFICULDADE_ENUM = ['facil', 'media', 'dificil'] as const

// Empty string → null so cleared optional fields persist as NULL, not ''.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((s) => (s.length === 0 ? null : s))
    .nullable()
    .optional()

const UpdateSchema = z.object({
  cardId: z.string().uuid('cardId must be a UUID'),
  front_text: z.string().trim().min(1, 'Frente não pode ficar vazia.').max(5000),
  back_text: z.string().trim().min(1, 'Verso não pode ficar vazio.').max(5000),
  fundamento_legal: optionalText(2000),
  explicacao_detalhada: optionalText(8000),
  dica_pegadinha: optionalText(2000),
  dificuldade: z.enum(DIFICULDADE_ENUM),
  status: z.enum(STATUS_ENUM),
})

export type UpdateCardResult = { ok: true } | { ok: false; error: string }

export async function updateFlashcardAction(input: {
  cardId: string
  front_text: string
  back_text: string
  fundamento_legal?: string | null
  explicacao_detalhada?: string | null
  dica_pegadinha?: string | null
  dificuldade: string
  status: string
}): Promise<UpdateCardResult> {
  const correlationId = crypto.randomUUID()
  const log = childLogger({ correlationId, action: 'updateFlashcard', cardId: input.cardId })

  const parsed = UpdateSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { ok: false, error: 'Sessão expirou.' }
  }

  const admin = await isAdmin(user.id)
  if (!admin) {
    log.warn('non-admin attempted card edit')
    return { ok: false, error: 'Acesso negado.' }
  }

  // Build explicitly with null coercion — exactOptionalPropertyTypes forbids
  // `undefined` reaching the Supabase Update type (wants string | null).
  const fields = {
    front_text: parsed.data.front_text,
    back_text: parsed.data.back_text,
    fundamento_legal: parsed.data.fundamento_legal ?? null,
    explicacao_detalhada: parsed.data.explicacao_detalhada ?? null,
    dica_pegadinha: parsed.data.dica_pegadinha ?? null,
    dificuldade: parsed.data.dificuldade,
    status: parsed.data.status,
  }
  const { error: updateError } = await supabase
    .from('admin_flashcards')
    .update(fields)
    .eq('id', parsed.data.cardId)

  if (updateError) {
    captureWithCorrelation(updateError, correlationId, { stage: 'admin_flashcards.edit' })
    log.error({ err: updateError.message }, 'edit failed')
    return { ok: false, error: 'Não foi possível salvar as alterações.' }
  }

  log.info('card edited')
  revalidatePath('/admin/flashcards')
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Batch archive by legislation — when a law is revoked, archive every card
// that references it in one shot. Matches fundamento_legal / legislacao_ref /
// front_text. Only touches active/review cards (idempotent on re-run).
// ---------------------------------------------------------------------------

const ArchiveSchema = z.object({
  term: z.string().trim().min(3, 'Termo muito curto (mín. 3 caracteres).').max(200),
  concursoId: z.string().uuid().optional(),
})

export type ArchiveResult = { ok: true; count: number } | { ok: false; error: string }

export async function archiveByLegislacaoAction(input: {
  term: string
  concursoId?: string
}): Promise<ArchiveResult> {
  const correlationId = crypto.randomUUID()
  const log = childLogger({ correlationId, action: 'archiveByLegislacao' })

  const parsed = ArchiveSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Termo inválido.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { ok: false, error: 'Sessão expirou.' }
  }

  const admin = await isAdmin(user.id)
  if (!admin) {
    log.warn('non-admin attempted batch archive')
    return { ok: false, error: 'Acesso negado.' }
  }

  // Escape PostgREST `or` filter wildcards/commas in the user term.
  const safe = parsed.data.term.replace(/[%,()]/g, ' ')
  const pattern = `%${safe}%`

  let q = supabase
    .from('admin_flashcards')
    .update({ status: 'archived' })
    .in('status', ['active', 'review'])
    .or(
      `fundamento_legal.ilike.${pattern},legislacao_ref.ilike.${pattern},front_text.ilike.${pattern}`,
    )
  if (parsed.data.concursoId) {
    q = q.eq('concurso_id', parsed.data.concursoId)
  }

  const { data, error: updateError } = await q.select('id')

  if (updateError) {
    captureWithCorrelation(updateError, correlationId, { stage: 'admin_flashcards.batch_archive' })
    log.error({ err: updateError.message }, 'batch archive failed')
    return { ok: false, error: 'Não foi possível arquivar em lote.' }
  }

  const count = data.length
  log.info({ term: parsed.data.term, count }, 'batch archived by legislacao')
  revalidatePath('/admin/flashcards')
  return { ok: true, count }
}
