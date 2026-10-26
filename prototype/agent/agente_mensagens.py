"""Agente de mensagens do CRM Alto Valor (MVP).

O QUE FAZ: pega a recomendação que o motor de regras já escolheu para um cliente e
redige um RASCUNHO de mensagem. Ele NÃO decide a ação, NÃO envia nada e respeita guardrails.

Uso (na raiz do repositório, só biblioteca padrão do Python):
  python prototype/agent/agente_mensagens.py C000634   # um cliente
  python prototype/agent/agente_mensagens.py --top 10  # os 10 de maior valor em risco

Modo de regras (padrão): texto de modelo por ação. Modo LLM (opcional): defina
LLM_API_KEY, LLM_BASE_URL (API compatível com OpenAI) e LLM_MODEL. Se o LLM falhar ou
violar um guardrail, o agente volta sozinho para o modo de regras.
"""
import csv, json, os, sys, urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA = PROJECT_ROOT / "docs" / "anac-data" / "processed"
OUT = Path(__file__).resolve().parent / "outputs"
APROVACAO_HUMANA = {"Recuperacao premium", "Protecao de jornada"}


def ler(nome):
    with open(DATA / nome, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f, delimiter=";"))


def carregar():
    c360 = {r["customer_id"]: r for r in ler("crm_customer_360_mvp.csv")}
    cadastro = {r["customer_id"]: r for r in ler("crm_customers_mvp.csv")}
    rotas = {}
    for r in ler("crm_flights_mvp.csv"):
        rotas.setdefault(r["customer_id"], Counter())[f'{r["origin_icao"]}-{r["destination_icao"]}'] += 1
    return c360, cadastro, rotas


def montar_pacote(cid, c360, cadastro, rotas):
    r, cad = c360[cid], cadastro[cid]
    valor = float(r["customer_value_score"])
    acao = r["next_best_experience"]
    return {
        "cliente": cid,
        "nivel": r["tier_current"],
        "rota_principal": (rotas.get(cid) or Counter({"": 0})).most_common(1)[0][0],
        "voos_12m": int(float(r["flights_12m"])),
        "nota_valor": valor, "nota_saude": float(r["relationship_health_score"]),
        "risco_perda": float(r["churn_risk_score"]),
        "acao_permitida": acao, "motivo": r["next_best_experience_reason"],
        "canal": r["recommended_channel"], "custo_maximo_brl": float(r["estimated_action_cost_brl"]),
        "consentimento_marketing": cad["consent_marketing"] == "1",
        "aprovacao_humana": acao in APROVACAO_HUMANA or valor >= 70,
        "valor_em_risco_brl": round(float(r["spend_12m_brl"]) * float(r["churn_risk_score"]) / 100, 2),
    }


def texto_regras(p):
    rota = f" em {p['rota_principal'].replace('-', ' → ')}" if p["rota_principal"] else ""
    t = {
        "Recuperacao premium": f"Olá! Sua experiência recente com a Azul ficou abaixo do que você merece. Um especialista vai entrar em contato e deixamos um benefício de cortesia para a sua próxima viagem{rota}.",
        "Protecao de jornada": f"Olá! Sabemos que seu último voo teve irregularidade. Já priorizamos sua próxima viagem{rota} com alternativas de voo e atendimento prioritário.",
        "Reconhecimento exclusivo": f"Obrigado por voar com a Azul! Preparamos um reconhecimento exclusivo para você, cliente {p['nivel']}, na próxima viagem{rota}.",
        "Oferta Cartao Azul Itau": f"Você voa com frequência{rota}. Com o cartão Azul Itaú, suas compras viram pontos para a próxima viagem. Veja se faz sentido para você.",
        "Oferta Clube Azul": f"Você já voou {p['voos_12m']} vezes nos últimos 12 meses. O Clube Azul transforma essa recorrência em pontos todo mês. Quer conhecer?",
        "Reativacao personalizada": f"Faz um tempo que não voamos juntos. Que tal voltar{rota}? Preparamos uma oferta pensando no seu histórico.",
        "Acelerador de tier": "Você está construindo seu caminho no Azul Fidelidade. Com mais algumas viagens, chega ao próximo nível e desbloqueia novos benefícios.",
    }
    return t[p["acao_permitida"]]


def texto_llm(p):
    """Chama um LLM (API compatível com OpenAI). Só recebe campos sem dados pessoais."""
    key, base, model = os.getenv("LLM_API_KEY"), os.getenv("LLM_BASE_URL"), os.getenv("LLM_MODEL")
    if not (key and base and model):
        return None
    seguro = {k: p[k] for k in ("nivel", "rota_principal", "voos_12m", "acao_permitida", "motivo", "canal")}
    corpo = {"model": model, "max_tokens": 200, "messages": [
        {"role": "system", "content": "Você redige mensagens curtas (até 400 caracteres), em português, para clientes de uma companhia aérea. Use apenas a ação permitida. Nunca prometa valores, descontos, percentuais ou prazos. Tom cordial."},
        {"role": "user", "content": json.dumps(seguro, ensure_ascii=False)}]}
    req = urllib.request.Request(base.rstrip("/") + "/chat/completions", data=json.dumps(corpo).encode(),
                                 headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.load(resp)["choices"][0]["message"]["content"].strip()


def violacao(texto):
    if len(texto) > 500:
        return "texto longo demais"
    if any(s in texto for s in ("R$", "%", "desconto de", "grátis")):
        return "promete valor ou desconto"
    return None


def redigir(p):
    """Devolve (texto, modo, observacao). Aplica os guardrails."""
    if not p["consentimento_marketing"]:
        return None, "bloqueado", "cliente sem consentimento de marketing: nenhuma mensagem gerada"
    try:
        t = texto_llm(p)
        if t:
            v = violacao(t)
            if not v:
                return t, "llm", "ok"
            return texto_regras(p), "regras", f"LLM descartado ({v})"
    except Exception as e:  # sem rede, chave inválida etc.
        return texto_regras(p), "regras", f"LLM indisponível ({type(e).__name__})"
    return texto_regras(p), "regras", "ok"


def processar(cid, dados):
    p = montar_pacote(cid, *dados)
    texto, modo, obs = redigir(p)
    reg = {"pacote": p, "rascunho": texto, "modo": modo, "observacao": obs,
           "status": "bloqueado" if modo == "bloqueado" else ("aguardando aprovação humana" if p["aprovacao_humana"] else "pronto para revisão"),
           "gerado_em": datetime.now(timezone.utc).isoformat(timespec="seconds")}
    OUT.mkdir(parents=True, exist_ok=True)
    with open(OUT / "auditoria.jsonl", "a", encoding="utf-8") as f:  # registro de cada execução
        f.write(json.dumps(reg, ensure_ascii=False) + "\n")
    return reg


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    dados = carregar()
    c360 = dados[0]
    if sys.argv[1] == "--top":
        n = int(sys.argv[2]) if len(sys.argv) > 2 else 10
        ids = sorted(c360, key=lambda i: -float(c360[i]["spend_12m_brl"]) * float(c360[i]["churn_risk_score"]))[:n]
    else:
        ids = [sys.argv[1]]
        if ids[0] not in c360:
            sys.exit(f"Cliente {ids[0]} não encontrado.")
    linhas = []
    for cid in ids:
        r = processar(cid, dados)
        p = r["pacote"]
        print(f"\n{cid} · {p['nivel']} · ação: {p['acao_permitida']} · canal: {p['canal']} · {r['status']} · modo: {r['modo']} ({r['observacao']})")
        print(f"  motivo: {p['motivo']} · custo máx: R$ {p['custo_maximo_brl']:.0f}")
        print(f"  rascunho: {r['rascunho']}")
        linhas.append({"cliente": cid, "acao": p["acao_permitida"], "canal": p["canal"], "status": r["status"], "modo": r["modo"], "rascunho": r["rascunho"] or ""})
    if len(ids) > 1:
        with open(OUT / "mensagens_exemplo.csv", "w", encoding="utf-8-sig", newline="") as f:
            w = csv.DictWriter(f, fieldnames=list(linhas[0]), delimiter=";")
            w.writeheader(); w.writerows(linhas)
        print(f"\nSalvo em {OUT / 'mensagens_exemplo.csv'}")


if __name__ == "__main__":
    main()
