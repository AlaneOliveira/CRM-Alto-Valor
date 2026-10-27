# Arquitetura técnica do protótipo

## Stack atual

| Tecnologia | Versão atual | Responsabilidade |
|---|---:|---|
| Next.js | 16.4.3 | framework, App Router, renderização e rotas |
| React | 19.3.1 | componentes e estado da interface |
| TypeScript | 5.9 | tipagem estática e contratos internos |
| Lucide React | 1.61.0 | ícones da interface |
| CSS nativo | projeto | layout, responsividade e identidade visual |
| Vitest | 5.0.5 | execução dos testes automatizados |
| Testing Library | 16.3.3 | testes de comportamento dos componentes |
| JSDOM | 30.1.3 | ambiente DOM para testes de frontend |
| Python | ambiente local | geração do CRM sintético e agente de mensagens |

As versões efetivamente instaladas devem ser confirmadas em `prototype/package.json` e `prototype/package-lock.json`.

## Decisões arquiteturais

### App Router

O protótipo usa o App Router do Next.js. Cada diretório em `prototype/app` representa uma rota. O layout raiz injeta fontes, metadados e o `AppShell` compartilhado.

### Server Components por padrão

As páginas e a camada de leitura de dados executam no servidor. Isso permite:

- ler CSVs com `node:fs` sem expor o sistema de arquivos ao navegador;
- calcular agregações antes de enviar HTML;
- reduzir JavaScript no cliente;
- manter o contrato de dados centralizado em `lib/data.ts`.

Rotas com parâmetros e busca, como `/clientes/[id]`, `/dados/[dataset]`, `/ativacoes` e `/rotas`, são renderizadas dinamicamente.

### Client Components somente onde há interação

Os componentes abaixo usam `"use client"`:

- `app-shell.tsx`: menu responsivo e controle da sidebar;
- `customer-explorer.tsx`: busca, filtros e paginação local;
- `activation-center.tsx`: fluxo em etapas, mensagens, aprovação e histórico.

### Sem API intermediária no MVP

O servidor Next.js lê diretamente os arquivos em `data/processed`. Não existem endpoints de escrita nem banco operacional. Essa decisão reduz complexidade para o hackathon, mas não é a arquitetura recomendada para produção.

## Estrutura do projeto

```text
prototype/
├── app/
│   ├── layout.tsx                 # layout raiz e metadados
│   ├── page.tsx                   # visão executiva
│   ├── globals.css                # tokens e estilos globais
│   ├── clientes/
│   │   ├── page.tsx               # explorador
│   │   └── [id]/                  # perfil 360 e not-found
│   ├── experiencias/page.tsx      # portfólio de NBE
│   ├── ativacoes/page.tsx         # preparação server-side dos candidatos
│   ├── rotas/page.tsx             # agregação e paginação de rotas
│   └── dados/                      # catálogo e datasets
├── components/
│   ├── app-shell.tsx              # navegação e shell responsivo
│   ├── ui.tsx                     # cards, badges, headers e indicadores
│   ├── priority-table.tsx         # fila executiva
│   ├── customer-explorer.tsx      # filtros e paginação
│   └── activation-center.tsx      # fluxo de ativação
├── lib/
│   ├── data.ts                    # acesso e agregação dos CSVs
│   ├── activations.ts             # mensagens, guardrails e status
│   ├── format.ts                  # formatação pt-BR
│   └── types.ts                   # contratos TypeScript
├── tests/                         # testes unitários e de componentes
├── agent/                         # agente Python independente
├── legacy/                        # painel HTML anterior, não principal
├── vitest.config.mts
├── next.config.ts
├── tsconfig.json
└── package.json
```

## Fluxo de dados no frontend

```text
CSV processado
   ↓ readFileSync
lib/data.ts
   ↓ objetos tipados e agregações
Server Component da rota
   ↓ props serializáveis
Client Component, quando necessário
   ↓ interação local
interface renderizada
```

`lib/data.ts` detecta se o processo está em `prototype` e resolve a pasta `../data/processed`. A leitura é encapsulada com `cache` do React para evitar trabalho repetido no mesmo ciclo de renderização.

## Módulos principais

### `lib/data.ts`

- parser de CSV separado por ponto e vírgula e compatível com campos entre aspas;
- acesso aos cinco datasets navegáveis;
- construção da visão executiva;
- agregação de rotas;
- busca do Customer 360;
- paginação e busca do catálogo.

### `lib/activations.ts`

- identificação de casos que exigem aprovação humana;
- templates de mensagem por NBE;
- validação de tamanho e promessas não autorizadas;
- rótulos e evolução do status da ativação;
- chave de persistência do histórico local.

### `lib/types.ts`

Define os contratos de Customer 360, datasets, visão executiva, rotas e ativações. Mudanças no esquema processado devem ser refletidas neste arquivo e na documentação de dados.

### `components/activation-center.tsx`

É o principal componente de estado do produto. Controla:

- aba de nova ativação ou histórico;
- modo individual ou lote;
- etapa atual;
- cliente, ação e canal selecionados;
- mensagem editável;
- aprovação humana;
- histórico persistido no navegador;
- simulação dos eventos de entrega, abertura e conversão.

## Estado e persistência

| Estado | Local | Persistência |
|---|---|---|
| filtros de clientes | React state | não persiste após recarregar |
| etapa e mensagem da ativação | React state | não persiste antes do envio simulado |
| histórico de ativações | `localStorage` | persiste no mesmo navegador |
| base analítica | CSV processado | persiste no repositório/ambiente |
| auditoria do agente Python | JSONL/CSV local | persiste em `prototype/agent/outputs` |

O `localStorage` é apropriado para demonstração, não para produção. Uma implantação real deve usar API autenticada e armazenamento corporativo auditável.

## Estilos e responsividade

O projeto usa CSS global próprio em `app/globals.css`, com:

- variáveis de cor e tipografia;
- shell lateral responsivo;
- grids para KPIs, cards e detalhes;
- tabelas com overflow horizontal;
- breakpoints para tablet e celular;
- estados visuais de sucesso, atenção e risco;
- componentes interativos com foco e hover.

Não há biblioteca externa de componentes. Os componentes reutilizáveis ficam em `components/ui.tsx`.

## Segurança e privacidade no MVP

- `server-only` impede o uso acidental da leitura de arquivos no cliente;
- nenhuma credencial é armazenada no frontend;
- nenhuma API externa é chamada pela Central de Ativação;
- nenhum cliente real é utilizado;
- consentimento e aprovação são guardrails explícitos;
- o agente recebe apenas atributos sintéticos necessários.

## Execução e validação

Na pasta `prototype`:

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

Scripts disponíveis:

| Script | Uso |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build otimizado e validação das rotas |
| `npm run start` | executar o build de produção |
| `npm run typecheck` | validar TypeScript sem emitir arquivos |
| `npm test` | executar todos os testes uma vez |
| `npm run test:watch` | executar testes em modo contínuo |

## Arquitetura de evolução

```text
Salesforce / Azul Fidelidade / canais / operação
                     │
                     ▼
        Snowflake raw → curated → analytics
                     │
          features e scores versionados
                     │
          motor de decisão / experimentos
                     │
       API autenticada de ativação e auditoria
                     │
          Salesforce Marketing / canais
                     │
        eventos de entrega e conversão
```

Para produção, também serão necessários autenticação, RBAC, cofre de segredos, observabilidade, filas, idempotência, definição de conversão por campanha e grupos de tratamento/controle.
