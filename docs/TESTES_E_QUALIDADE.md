# Testes e qualidade

## Visão geral

O projeto possui duas camadas independentes de qualidade:

1. **qualidade dos dados:** produzida pelo pipeline em `data/quality/crm_mvp_quality.json`;
2. **testes da aplicação:** executados por Vitest em `prototype/tests`.

As duas camadas são necessárias. Um frontend sem erros não garante dados consistentes, e dados consistentes não garantem que os fluxos da interface funcionem.

## Tecnologias de teste

| Tecnologia | Papel |
|---|---|
| Vitest | runner, asserções e relatórios |
| Testing Library | renderização e interação orientada ao usuário |
| User Event | cliques, digitação e seleção realistas |
| JSDOM | DOM e `localStorage` em ambiente de teste |
| jest-dom | asserções de acessibilidade e estado visual semântico |

Configuração: `prototype/vitest.config.mts`.

## Suíte atual

| Arquivo | Cobertura principal |
|---|---|
| `activations.test.ts` | aprovação humana, templates, guardrails e ciclo de status |
| `format.test.ts` | moeda, números, percentuais, datas, tiers e ações |
| `data.test.ts` | leitura das bases, visão executiva, Customer 360, catálogo e rotas |
| `customer-explorer.test.tsx` | busca, filtros, paginação, total e link do perfil |
| `activation-center.test.tsx` | aprovação, envio simulado, conversão, consentimento e mensagem bloqueada |

Estado validado em 26/10/2026:

```text
Test Files: 5 passed
Tests:      25 passed
```

## Regras críticas cobertas

- score de valor igual ou superior a 70 exige aprovação humana;
- Recuperação premium e Proteção de jornada sempre exigem aprovação;
- mensagens muito curtas ou acima de 500 caracteres são bloqueadas;
- promessas de preço, percentual, desconto ou gratuidade são bloqueadas;
- status avança de enviado para entregue, aberto e convertido;
- conversão é estado terminal;
- cliente sem consentimento não chega à revisão final;
- ativação aprovada gera registro no `localStorage`;
- filtros reduzem corretamente a lista de clientes;
- alteração de busca retorna à primeira página;
- fila prioritária permanece ordenada pelo valor em risco;
- rotas permanecem ordenadas por recorrência;
- busca do catálogo respeita o dataset e limita a página.

## Como executar

Na pasta `prototype`:

```powershell
npm.cmd test
```

Modo contínuo:

```powershell
npm.cmd run test:watch
```

Validação completa antes de entrega:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

Na raiz do repositório, os mesmos comandos podem ser executados com `--prefix prototype`.

## Qualidade do pipeline de dados

O arquivo `crm_mvp_quality.json` registra verificações como:

- unicidade das chaves;
- integridade de `customer_id` entre tabelas;
- presença das saídas esperadas;
- scores entre 0 e 100;
- domínios controlados;
- continuidade temporal das fontes públicas;
- contagens e distribuição das recomendações.

Antes de apresentar ou atualizar a aplicação, confirmar:

1. `status = pass` no relatório de qualidade;
2. `ready_for_mvp` no catálogo;
3. testes da aplicação aprovados;
4. TypeScript aprovado;
5. build de produção aprovado.

## Estratégia de fixtures

- testes de regras usam objetos sintéticos pequenos e determinísticos;
- testes de componentes usam carteiras artificiais locais;
- testes de dados leem somente os CSVs processados do próprio MVP;
- `server-only` é substituído por um módulo vazio apenas dentro do ambiente Vitest;
- o `localStorage` é limpo após cada teste para evitar dependência entre casos.

## O que ainda não está coberto

- teste visual automatizado por screenshot;
- testes end-to-end em navegador real;
- acessibilidade automatizada com axe;
- API e integrações externas, pois ainda não existem;
- autenticação e autorização;
- concorrência, idempotência e reprocessamento de eventos;
- desempenho com volume corporativo;
- contrato com Snowflake, Salesforce ou provedores de mensagem.

## Próximas evoluções

1. adicionar Playwright para o fluxo completo em navegador;
2. adicionar testes de acessibilidade;
3. criar fixtures de contrato para eventos de canais;
4. testar idempotência e repetição de webhooks;
5. adicionar cobertura de código somente quando ela orientar risco real, evitando perseguir percentual sem valor;
6. executar testes, TypeScript e build em integração contínua.
