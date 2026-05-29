import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderCloze } from '@/components/cloze'

// Locks the cloze rendering contract — most importantly the answer-leak
// guard (a hidden Anki cloze must NEVER show its answer on the card front).
describe('renderCloze', () => {
  it('returns plain text unchanged when there is no cloze', () => {
    render(<div data-testid="c">{renderCloze('Texto sem lacuna.', false)}</div>)
    expect(screen.getByTestId('c')).toHaveTextContent('Texto sem lacuna.')
  })

  it('hides the answer of an Anki cloze when reveal=false (answer-leak guard)', () => {
    render(<div data-testid="c">{renderCloze('A capital é {{c1::Brasília}}.', false)}</div>)
    const el = screen.getByTestId('c')
    expect(el).not.toHaveTextContent('Brasília')
    expect(el).toHaveTextContent('____') // blank placeholder
    expect(el).toHaveTextContent('A capital é')
  })

  it('reveals the answer of an Anki cloze when reveal=true', () => {
    render(<div data-testid="c">{renderCloze('A capital é {{c1::Brasília}}.', true)}</div>)
    expect(screen.getByTestId('c')).toHaveTextContent('A capital é Brasília.')
  })

  it('hides every answer of a multi-cloze card when reveal=false', () => {
    render(<div data-testid="c">{renderCloze('{{c1::rígida}} e {{c2::flexível}}', false)}</div>)
    const el = screen.getByTestId('c')
    expect(el).not.toHaveTextContent('rígida')
    expect(el).not.toHaveTextContent('flexível')
  })

  it('reveals every answer of a multi-cloze card when reveal=true', () => {
    render(<div data-testid="c">{renderCloze('{{c1::rígida}} e {{c2::flexível}}', true)}</div>)
    const el = screen.getByTestId('c')
    expect(el).toHaveTextContent('rígida')
    expect(el).toHaveTextContent('flexível')
  })

  it('renders a TJSP-style placeholder {{______}} as a blank even on reveal (answer lives in back_text)', () => {
    render(<div data-testid="c">{renderCloze('O prazo é de {{______}} dias.', true)}</div>)
    const el = screen.getByTestId('c')
    expect(el).toHaveTextContent('____')
    expect(el).toHaveTextContent('O prazo é de')
    expect(el).toHaveTextContent('dias.')
  })
})
