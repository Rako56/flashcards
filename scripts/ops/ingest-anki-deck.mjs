#!/usr/bin/env node
/**
 * ingest-anki-deck.mjs — bulk import de cards.json (extraídos de .apkg)
 * pro admin_flashcards, categorizando por deck_path_original.
 *
 * USO:
 *   node scripts/ops/ingest-anki-deck.mjs <rootDir> <concursoId> [--disciplina="X"] [--dry]
 *
 * - Conexão: lê a connection string de supabase/.temp/pooler-url (senha
 *   nunca passa por argumento/stdout). SSL obrigatório (Supabase).
 * - Categorização: deck_path_original "Bloco::Disciplina::Tópico" →
 *   disciplina_titulo + topico_titulo (strip de prefixos "N." / "a.").
 * - tipo_card: "C ou E?" → vf; contém {{c → cloze; senão conceito.
 * - status='review' (NÃO vai live), review_status='pending',
 *   source_pipeline='flashcard-pipeline-inbox'.
 * - Dedup por nid (extras->>'nid'): re-rodar é seguro, pula o que já entrou.
 * - Insert parametrizado em lotes de 500 (zero problema de escape).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const [, , rootDir, concursoId, ...rest] = process.argv
if (!rootDir || !concursoId) {
  console.error('uso: node ingest-anki-deck.mjs <rootDir> <concursoId> [--disciplina="X"] [--dry]')
  process.exit(1)
}
const dry = rest.includes('--dry')
const discFilter = (rest.find((a) => a.startsWith('--disciplina=')) || '').split('=')[1] || null

const stripPrefix = (s) =>
  (s || '')
    .replace(/^\s*[\dIVXa-z]+\s*[.\-)]\s*/i, '')
    .replace(/^\s*\.\s*/, '')
    .trim()

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, acc)
    else if (name === 'cards.json') acc.push(p)
  }
  return acc
}

function detectTipo(front) {
  if (/\bC ou E\?\s*$/i.test(front)) return 'vf'
  if (front.includes('{{c')) return 'cloze'
  return 'conceito'
}

function loadCards() {
  const out = []
  for (const f of walk(rootDir)) {
    let d
    try {
      d = JSON.parse(readFileSync(f, 'utf8'))
    } catch {
      continue
    }
    const parts = (d.deck_path_original || '').split('::').map((x) => x.trim())
    if (parts.length < 2) continue
    const disciplina = stripPrefix(parts[1])
    if (discFilter && disciplina.toLowerCase() !== discFilter.toLowerCase()) continue
    const topico = parts.length >= 3 ? stripPrefix(parts.slice(2).join(' — ')) || 'Geral' : 'Geral'
    for (const c of d.cards || []) {
      const front = (c.frente || '').trim()
      const back = (c.verso || '').trim()
      if (!front || !back || !c.nid) continue
      out.push({
        nid: String(c.nid),
        front,
        back,
        tipo: detectTipo(front),
        disciplina,
        topico,
        modelo: c.modelo || '',
      })
    }
  }
  return out
}

async function main() {
  // Conexão com params EXPLÍCITOS (não connectionString — o pg mis-parseia
  // o username `postgres.<ref>` do pooler). user/host/port vêm do
  // pooler-url do `supabase link`; a senha vem de supabase/.temp/dbpass
  // (gitignorado) ou da env PGPASSWORD.
  const pooler = readFileSync(join('supabase', '.temp', 'pooler-url'), 'utf8').trim()
  const user = pooler.match(/\/\/([^:@/]+)/)[1]
  const host = pooler.match(/@([^:/]+)/)[1]
  const port = parseInt((pooler.match(/:(\d+)\//) || [])[1] || '5432', 10)
  let password = process.env.PGPASSWORD || ''
  if (!password) password = readFileSync(join('supabase', '.temp', 'dbpass'), 'utf8').trim()
  const cards = loadCards()
  console.log(`carregados ${cards.length} cards crus${discFilter ? ` (disciplina=${discFilter})` : ''}`)

  const byDisc = {}
  for (const c of cards) byDisc[c.disciplina] = (byDisc[c.disciplina] || 0) + 1
  console.log('por disciplina:', byDisc)

  if (dry) {
    console.log('[dry-run] nada inserido.')
    return
  }

  const { Client } = require('pg')
  const client = new Client({
    user,
    password,
    host,
    port,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  try {
    // Dedup: nids já presentes nesse concurso
    const existing = await client.query(
      `SELECT extras->>'nid' AS nid FROM admin_flashcards
       WHERE concurso_id = $1 AND extras->>'nid' IS NOT NULL`,
      [concursoId],
    )
    const seen = new Set(existing.rows.map((r) => r.nid))
    const fresh = cards.filter((c) => !seen.has(c.nid))
    console.log(`${seen.size} já no banco · ${fresh.length} novos a inserir`)

    let inserted = 0
    const BATCH = 500
    for (let i = 0; i < fresh.length; i += BATCH) {
      const slice = fresh.slice(i, i + BATCH)
      const values = []
      const params = []
      slice.forEach((c, j) => {
        const b = j * 13
        values.push(
          `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9},$${b + 10},$${b + 11},$${b + 12},$${b + 13})`,
        )
        params.push(
          concursoId,
          c.tipo,
          c.front,
          c.back,
          'media',
          ['import-anki-cru'],
          'review',
          c.disciplina,
          c.topico,
          'pt',
          'flashcard-pipeline-inbox',
          'pending',
          JSON.stringify({ nid: c.nid, modelo: c.modelo, origem: 'apkg-correios-advogado' }),
        )
      })
      const sql = `INSERT INTO admin_flashcards
        (concurso_id, tipo_card, front_text, back_text, dificuldade, tags, status,
         disciplina_titulo, topico_titulo, language_code, source_pipeline, review_status, extras)
        VALUES ${values.join(',')}`
      await client.query(sql, params)
      inserted += slice.length
      process.stdout.write(`\r  inseridos ${inserted}/${fresh.length}`)
    }
    console.log(`\n✓ ${inserted} cards inseridos como review.`)
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error('ERRO:', e.message)
  process.exit(1)
})
