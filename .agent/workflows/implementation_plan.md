---
description: Implementation plan for restructuring AllocatorsSimplified
---

# Plano de Implementação

## Parte 1: Frontend - Navegação e Organização

### 1.1 menuConfig.ts - Modo "Fundos de Investimento"
- ESCONDER: "Resumo" e "Laboratório" no modo fundos
- Em Distribuição: tirar "Fluxo do Cliente" e "Performance"
- Renomear "Distribuição" para "Fluxo do Cliente" (contém apenas a tela de fluxo)
- "Carteira Completa" vira parte da tela "Carteira" com sub-tabs:
  - Performance
  - Completa
  - Movimentação

### 1.2 AllocatorsSimplified.tsx - Reestruturar tabs
- Tab "Fluxo do Cliente" → renomeia para entrada "Fluxo do Cliente" no menu 
- Criar tab "Carteira" com sub-tabs:
  - Performance (conteúdo atual da tab performance)
  - Completa (conteúdo da carteira completa + gráfico de colunas decrescente com cotas de fundos)
  - Movimentação (nova tela com gráfico de barras + scatter plot)

### 1.3 Index.tsx - Ajustar renderViewConfig

## Parte 2: Backend - Reestruturar API

### 2.1 Criar register.py
- Arquivo central unificando todos os dataframes
- Cada key JSON → uma função que retorna dataframe
- Extrema usabilidade para o usuário

### 2.2 Reestruturar queries.py  
- Funções separadas retornando dataframes
- Arquivo principal de definição

### 2.3 Criar endpoint de Movimentação (mock)
- Dados mockados no servidor (o cliente não sabe)
- Gráfico de barras: 12 meses, mês a mês, por gestor
- Scatter plot: X = crescimento vs posição inicial, Y = alocação no gestor
- Tooltip rica com valores, % do gestor comparado (Kinea default), % CL
- Períodos: 1M, 3M, 6M, 12M, 24M, 36M, 48M, 60M
- Todos os dados carregados de uma vez (sem reload por período)

## Parte 3: Testes e Validação
- Testar para Itaú / Itaú Rigel
- Verificar nomes batem (Itaú Rigel sem acento no segmentado)
- Consultas LIMIT 10 de validação
