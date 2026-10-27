# CRM Alto Valor - Protótipo Next.js

Aplicação analítica para demonstrar a estratégia de retenção do MVP. A interface lê diretamente os CSVs de `data/processed`; nenhum KPI principal fica copiado manualmente no código.

## Stack

- Next.js 16 com App Router;
- React 19 e TypeScript;
- Server Components para leitura e agregação dos CSVs;
- componentes client-side somente para navegação e filtros interativos;
- CSS responsivo próprio, sem dependência de um design system externo.

## Rodar localmente

No PowerShell, a partir da pasta `prototype`:

```powershell
npm.cmd install
npm.cmd run dev
```

Abra `http://localhost:3000`.

Também é possível executar a partir da raiz:

```powershell
npm.cmd --prefix prototype install
npm.cmd --prefix prototype run dev
```

## Verificações

```powershell
npm.cmd run typecheck
npm.cmd run build
```

## Áreas da aplicação

- `/`: visão executiva, KPIs, scores, fila prioritária e principais rotas;
- `/clientes`: busca e filtros sobre os 1.500 clientes sintéticos;
- `/clientes/[id]`: perfil 360 com scores, recomendação, voos e interações;
- `/experiencias`: distribuição e impacto estimado das Next Best Experiences;
- `/ativacoes`: ativação individual ou em lote, guardrails, aprovação e envio simulado;
- `/rotas`: ranking operacional derivado de todos os voos sintéticos;
- `/dados`: catálogo e acesso paginado a todas as tabelas processadas;
- `/dados/[dataset]`: busca em qualquer coluna e navegação por todos os registros.

## Organização

```text
prototype/
|-- app/                  # rotas, páginas e estilos globais
|-- components/           # shell, tabelas, filtros e componentes visuais
|-- lib/                  # leitura de CSV, tipos e formatação
|-- agent/                # agente de mensagens do MVP
|-- legacy/               # protótipo HTML anterior preservado
|-- package.json
`-- next.config.ts
```

## Testes automatizados

A suíte usa Vitest, Testing Library e JSDOM. Ela cobre regras de ativação, guardrails de mensagem, evolução do status, cálculos sobre as bases processadas, filtros e paginação de clientes e o fluxo completo de envio simulado.

```powershell
npm test
npm run test:watch
npm run typecheck
```

Os testes ficam em `prototype/tests` e usam exclusivamente dados sintéticos ou fixtures locais.

## Dados

A camada de acesso resolve `../data/processed` quando a aplicação é executada em `prototype`. São consumidos:

- `crm_customers_mvp.csv`;
- `crm_customer_360_mvp.csv`;
- `crm_flights_mvp.csv`;
- `crm_interactions_mvp.csv`;
- `crm_data_dictionary.csv`.

Os clientes e seus eventos são inteiramente sintéticos. Os dados públicos da ANAC são usados somente para calibração de tarifa, rota e experiência operacional.

## Protótipo anterior

O HTML autocontido e seu atualizador foram preservados em `prototype/legacy`. Eles servem como referência histórica, mas a aplicação principal agora é o projeto Next.js.

## Agente

O agente continua independente da interface:

```powershell
python prototype/agent/agente_mensagens.py C000634
python prototype/agent/agente_mensagens.py --top 10
```

O modo de regras é o fluxo padrão. A integração LLM permanece opcional e ainda precisa de homologação com um provedor real.

## Simulação de ativação

A Central de Ativação fecha o ciclo entre diagnóstico e ação sem chamar canais externos. O histórico é persistido no `localStorage` do navegador e pode ser exportado em JSON para demonstrar a auditoria.

Fluxo disponível:

1. selecionar um cliente ou público de uma NBE;
2. revisar a mensagem gerada pelo modo de regras;
3. validar consentimento, conteúdo e aprovação humana;
4. simular o envio;
5. simular entrega, abertura e conversão no histórico.
