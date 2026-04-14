/**
 * Agente gerador de testes para jogos.
 *
 * Uso:
 *   npx tsx agent/generate-tests.ts tictactoe
 *   npx tsx agent/generate-tests.ts snake
 *   npx tsx agent/generate-tests.ts nave
 *   npx tsx agent/generate-tests.ts --all
 *
 * Requer: ANTHROPIC_API_KEY no ambiente.
 */

import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const TESTS_DIR = path.join(ROOT, 'tests')

const client = new Anthropic()

// ─── Descoberta de jogos ──────────────────────────────────────────────────────

function discoverGames(): string[] {
  return fs
    .readdirSync(ROOT)
    .filter(entry => {
      const full = path.join(ROOT, entry)
      return (
        fs.statSync(full).isDirectory() &&
        !['agent', 'tests', '.git', 'node_modules'].includes(entry) &&
        fs.existsSync(path.join(full, 'index.html'))
      )
    })
}

// ─── Prompt para o Claude ─────────────────────────────────────────────────────

function buildPrompt(gameName: string, sourceCode: string): string {
  return `Você é um engenheiro de QA especialista em jogos web.

Analise o código-fonte do jogo "${gameName}" abaixo e gere um arquivo de testes completo usando **Vitest + jsdom**.

### Requisitos obrigatórios dos testes

1. **Placar / Pontuação**
   - Placar começa em zero
   - Placar incrementa corretamente ao marcar ponto
   - Placar não decrementa
   - Placar do vencedor é atualizado após fim de rodada
   - Empates são contabilizados separadamente (quando aplicável)

2. **Movimentos proibidos**
   - Não é possível jogar em posição já ocupada (Tic Tac Toe)
   - Cobra não pode inverter direção 180° (Snake)
   - Não é possível atirar quando o jogo não está em andamento (Nave)
   - Qualquer outra restrição de movimento específica do jogo

3. **Situações de jogabilidade**
   - Detecção correta de vitória/derrota
   - Alternância de turno entre jogadores (quando aplicável)
   - Estado do jogo após reset/nova rodada
   - Colisão que encerra o jogo (Snake, Nave)
   - Progressão de nível/onda (quando aplicável)

### Instruções técnicas

- O código do jogo usa lógica em \`<script>\` inline no HTML. Para testar, extraia e re-declare as funções/variáveis relevantes no escopo do teste usando \`eval()\` ou reescreva a lógica de estado como funções puras.
- Prefira testar a **lógica pura** (state + funções) ao invés de DOM.
- Use \`beforeEach\` para resetar o estado entre testes.
- Cada \`describe\` deve cobrir uma categoria (Placar, Movimentos Proibidos, Jogabilidade).
- Nomes de testes em **português**.
- Produza **apenas o código TypeScript/JavaScript do arquivo de testes**, sem markdown, sem explicações, sem blocos de código cercados por \`\`\`.

### Código-fonte do jogo

${sourceCode}
`
}

// ─── Gerador principal ────────────────────────────────────────────────────────

async function generateTests(gameName: string): Promise<void> {
  const gamePath = path.join(ROOT, gameName, 'index.html')

  if (!fs.existsSync(gamePath)) {
    console.error(`❌  Jogo não encontrado: ${gamePath}`)
    process.exit(1)
  }

  const sourceCode = fs.readFileSync(gamePath, 'utf-8')
  console.log(`\n🎮  Gerando testes para: ${gameName}`)
  console.log('    Enviando para Claude...')

  let testCode = ''

  // Streaming para acompanhar a geração em tempo real
  const stream = client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 8000,
    thinking: { type: 'adaptive' },
    messages: [
      {
        role: 'user',
        content: buildPrompt(gameName, sourceCode),
      },
    ],
  })

  process.stdout.write('    ')
  let charCount = 0

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      testCode += event.delta.text
      process.stdout.write('.')
      charCount++
      if (charCount % 60 === 0) process.stdout.write('\n    ')
    }
  }

  process.stdout.write('\n')

  // Remove possíveis blocos de markdown que o modelo insira
  testCode = testCode
    .replace(/^```(?:typescript|javascript|ts|js)?\n?/m, '')
    .replace(/\n?```$/m, '')
    .trim()

  // Garante que a pasta tests/ existe
  fs.mkdirSync(TESTS_DIR, { recursive: true })

  const outPath = path.join(TESTS_DIR, `${gameName}.test.ts`)
  fs.writeFileSync(outPath, testCode, 'utf-8')

  console.log(`    ✅  Testes salvos em: tests/${gameName}.test.ts`)
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log('Uso:')
    console.log('  npx tsx agent/generate-tests.ts <jogo>')
    console.log('  npx tsx agent/generate-tests.ts --all')
    console.log('\nJogos disponíveis:', discoverGames().join(', '))
    process.exit(0)
  }

  const targets =
    args[0] === '--all' ? discoverGames() : args

  for (const game of targets) {
    await generateTests(game)
  }

  console.log('\n✨  Concluído! Execute os testes com:')
  console.log('    npm test\n')
}

main().catch(err => {
  console.error('Erro:', err.message)
  process.exit(1)
})
