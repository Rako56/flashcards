#!/usr/bin/env node
/**
 * One-off operational script: configura o webhook do Asaas pra apontar
 * pra https://flashcards.com.br/api/webhooks/asaas com o token que
 * está em ASAAS_WEBHOOK_TOKEN.
 *
 * USO:
 *
 *   1. Garante que a Vercel tem ASAAS_API_KEY + ASAAS_WEBHOOK_TOKEN
 *      + ASAAS_API_BASE setados (esse passo já foi feito).
 *
 *   2. No painel Vercel (Settings → Environment Variables) clica em
 *      cada uma das 3 vars, "Show value" e copia. Vai precisar pra
 *      rodar este script.
 *
 *   3. Roda local com as 3 vars em linha (no PowerShell, prefixa
 *      `$env:VAR='valor';` antes do node):
 *
 *      ASAAS_API_KEY='$aact_prod_xxx' \
 *      ASAAS_WEBHOOK_TOKEN='abc123...' \
 *      ASAAS_API_BASE='https://www.asaas.com/api/v3' \
 *      node scripts/ops/setup-asaas-webhook.mjs
 *
 *   4. Script lista os webhooks existentes, identifica o "flashcards"
 *      (ou cria um novo se não existir), e atualiza:
 *      - URL: https://flashcards.com.br/api/webhooks/asaas
 *      - Auth Token: mesmo valor de ASAAS_WEBHOOK_TOKEN
 *      - Eventos: PAYMENT_CREATED, CONFIRMED, RECEIVED, OVERDUE, REFUNDED
 *      - Enabled: true
 *
 *   5. Imprime o estado final + manda webhook de teste pro endpoint
 *      pra confirmar handshake.
 *
 * SEGURANÇA: o script NUNCA imprime as chaves. Mostra só mascarado.
 */

const REQUIRED_EVENTS = [
  'PAYMENT_CREATED',
  'PAYMENT_CONFIRMED',
  'PAYMENT_RECEIVED',
  'PAYMENT_OVERDUE',
  'PAYMENT_REFUNDED',
]

const WEBHOOK_URL = 'https://flashcards.com.br/api/webhooks/asaas'
const WEBHOOK_NAME = 'flashcards'

function mask(str, head = 6) {
  if (!str) return '(empty)'
  if (str.length <= head + 4) return '*'.repeat(str.length)
  return str.slice(0, head) + '...' + str.slice(-4)
}

function die(msg) {
  console.error('\x1b[31m' + msg + '\x1b[0m')
  process.exit(1)
}

const apiKey = process.env.ASAAS_API_KEY
const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN
const apiBase = process.env.ASAAS_API_BASE || 'https://www.asaas.com/api/v3'

if (!apiKey) die('Falta ASAAS_API_KEY. Pega no painel Asaas (Integrações > Chaves API).')
if (!webhookToken) die('Falta ASAAS_WEBHOOK_TOKEN. Pega no painel Vercel (env vars, Show value).')

console.log('=== Asaas Webhook Setup ===')
console.log('API base   :', apiBase)
console.log('API key    :', mask(apiKey))
console.log('Token      :', mask(webhookToken))
console.log('Webhook URL:', WEBHOOK_URL)
console.log('')

async function asaas(method, path, body) {
  const res = await fetch(apiBase + path, {
    method,
    headers: {
      access_token: apiKey,
      'Content-Type': 'application/json',
      'User-Agent': 'flashcards-ops-setup/1.0',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text }
  }
  return { status: res.status, ok: res.ok, body: json }
}

async function main() {
  // 1. Lista webhooks existentes
  console.log('→ GET /webhooks (lista)')
  const list = await asaas('GET', '/webhooks')
  if (!list.ok) die(`Falha listar webhooks: HTTP ${list.status} — ${JSON.stringify(list.body)}`)

  const data = list.body?.data ?? []
  console.log(`  ${data.length} webhook(s) encontrado(s):`)
  for (const w of data) {
    console.log(`  · id=${w.id} name="${w.name}" url=${w.url} enabled=${w.enabled}`)
  }
  console.log('')

  // 2. Tenta achar o webhook flashcards
  let target = data.find((w) => w.name === WEBHOOK_NAME || w.url?.includes('flashcards.com.br'))

  const payload = {
    name: WEBHOOK_NAME,
    url: WEBHOOK_URL,
    email: 'rafanunes23rj@gmail.com',
    apiVersion: 3,
    enabled: true,
    interrupted: false,
    authToken: webhookToken,
    sendType: 'SEQUENTIALLY',
    events: REQUIRED_EVENTS,
  }

  if (target) {
    console.log(`→ POST /webhooks/${target.id} (atualizar existente)`)
    const updated = await asaas('POST', `/webhooks/${target.id}`, payload)
    if (!updated.ok) {
      // Asaas usa POST pra update em alguns endpoints, PUT em outros — tenta PUT também
      console.log(`  POST falhou (${updated.status}). Tentando PUT...`)
      const putRes = await asaas('PUT', `/webhooks/${target.id}`, payload)
      if (!putRes.ok) die(`Falha atualizar: HTTP ${putRes.status} — ${JSON.stringify(putRes.body)}`)
      console.log('  ✓ Atualizado (PUT)')
    } else {
      console.log('  ✓ Atualizado (POST)')
    }
  } else {
    console.log('→ POST /webhooks (criar novo, não encontrei "flashcards")')
    const created = await asaas('POST', '/webhooks', payload)
    if (!created.ok)
      die(`Falha criar webhook: HTTP ${created.status} — ${JSON.stringify(created.body)}`)
    target = created.body
    console.log(`  ✓ Criado: id=${target.id}`)
  }
  console.log('')

  // 3. Re-verifica estado final
  console.log('→ GET /webhooks (estado final)')
  const verify = await asaas('GET', '/webhooks')
  const final = (verify.body?.data ?? []).find((w) => w.id === target.id)
  if (!final) die('Não consegui re-encontrar o webhook após save.')

  console.log('  Estado final:')
  console.log(`  · id        : ${final.id}`)
  console.log(`  · name      : ${final.name}`)
  console.log(`  · url       : ${final.url}`)
  console.log(`  · enabled   : ${final.enabled}`)
  console.log(`  · sendType  : ${final.sendType}`)
  console.log(`  · events    : ${final.events?.length ?? 0} ativos`)
  const missing = REQUIRED_EVENTS.filter((e) => !final.events?.includes(e))
  if (missing.length) {
    console.warn(`  ⚠ FALTA marcar: ${missing.join(', ')}`)
  } else {
    console.log(`  · todos os ${REQUIRED_EVENTS.length} eventos requisitados estão marcados ✓`)
  }
  console.log('')

  console.log('\x1b[32m=== Webhook configurado com sucesso ===\x1b[0m')
  console.log('Próximo: testa um pagamento PIX no /checkout em produção e olha em /admin/webhooks.')
}

main().catch((err) => die(`Erro inesperado: ${err.message ?? err}`))
