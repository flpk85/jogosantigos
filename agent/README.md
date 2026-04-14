# Agente Gerador de Testes

Usa Claude Opus 4.6 para analisar o código-fonte dos jogos e gerar testes automaticamente.

## Pré-requisitos

- Node.js 18+
- Chave de API da Anthropic

## Instalação

```bash
cd agent
npm install
```

## Configuração

```bash
# Windows (PowerShell)
$env:ANTHROPIC_API_KEY="sua_chave_aqui"

# Windows (CMD)
set ANTHROPIC_API_KEY=sua_chave_aqui
```

## Uso

```bash
# Gerar testes para um jogo específico
npx tsx generate-tests.ts tictactoe
npx tsx generate-tests.ts snake
npx tsx generate-tests.ts nave

# Gerar testes para todos os jogos de uma vez
npx tsx generate-tests.ts --all
```

## Executar os testes gerados

```bash
npm test
```

## O que é testado

O agente gera testes cobrindo 3 categorias por jogo:

| Categoria | Exemplos |
|---|---|
| **Placar** | Começa em zero, incrementa ao pontuar, vencedor atualizado |
| **Movimentos proibidos** | Célula ocupada, inversão de direção, atirar fora do jogo |
| **Jogabilidade** | Detecção de vitória, alternância de turno, reset, colisão |

## Estrutura gerada

```
jogosantigos/
  agent/
    generate-tests.ts   ← agente
    package.json
    vitest.config.ts
  tests/
    tictactoe.test.ts   ← gerado pelo agente
    snake.test.ts
    nave.test.ts
```
