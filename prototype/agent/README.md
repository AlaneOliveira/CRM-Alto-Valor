# Agente de mensagens (MVP)

Lê a recomendação que o motor de regras já escolheu para cada cliente e redige um **rascunho** de mensagem.
O agente **não decide a ação, não envia nada** e passa por guardrails. Dados 100% sintéticos.

## Rodar (só biblioteca padrão do Python 3.10+)

Na raiz do repositório:

```powershell
python prototype/agent/agente_mensagens.py C000634
python prototype/agent/agente_mensagens.py --top 10
```

`--top N` pega os N clientes com maior valor em risco e salva `prototype/agent/outputs/mensagens_exemplo.csv`.
Cada execução é registrada em `prototype/agent/outputs/auditoria.jsonl`.

## O que o agente faz

1. Monta o pacote do cliente: nível, rota principal, notas de valor, saúde e risco, ação permitida, motivo, canal e custo máximo.
2. Confere os guardrails: **sem consentimento de marketing, nenhuma mensagem é gerada**; mensagens nunca prometem valores, descontos ou percentuais; casos de alto valor, recuperação premium e proteção de jornada ficam marcados como "aguardando aprovação humana".
3. Redige o rascunho. **Modo de regras (padrão):** texto de modelo por ação. **Modo LLM (opcional):** se existirem as variáveis `LLM_API_KEY`, `LLM_BASE_URL` (API compatível com OpenAI) e `LLM_MODEL`, o LLM redige a partir de um pacote sem dados pessoais. Se o LLM falhar ou violar um guardrail, o agente volta sozinho ao modo de regras.

## Limitações

- O modo LLM não foi testado com um provedor real (só o retorno ao modo de regras quando ele falha).
- Não envia mensagens e não mede resposta do cliente.
- Os textos do modo de regras são modelos fixos.

## Estado em 26/10/2026

- Modo de regras: implementado e executável localmente.
- Guardrails, consentimento e trilha de auditoria: implementados.
- Integração com LLM: preparada por variáveis de ambiente, ainda sem homologação com provedor real.
- Envio por CRM/canal: fora do MVP; os textos permanecem como rascunhos para revisão humana.
