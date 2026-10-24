# Protótipo — Painel de Retenção (CRM Alto Valor)

Painel estático (`index.html`, sem dependências, abre direto no navegador) que consome as tabelas já geradas em `docs/anac-data/processed`.
Nada do pipeline existente foi alterado. Os dados são sintéticos; nenhum registro representa pessoa real.

## Ver o painel

Não precisa de Python. Dê dois cliques em `prototype/index.html` ou clique com o botão direito, **Abrir com**, **Google Chrome**.

Se o navegador bloquear algo, rode na raiz do repositório:

```powershell
python -m http.server 8000
```

e abra `http://localhost:8000/prototype/` no Chrome.

## Rodar o Python

1. Instale o Python 3.10 ou mais novo (python.org). No instalador, marque **Add python.exe to PATH**.
2. Confirme no PowerShell: `python --version`.
3. Instale a dependência do protótipo: `pip install pandas`.

Os scripts do pipeline (`scripts/anac/*.py`) usam só a biblioteca padrão, sem pacotes extras.

## Atualizar os dados do painel

Rode **na raiz do repositório**:

```powershell
python prototype/build_data.py
```

O script lê `crm_customer_360_mvp.csv` e `crm_flights_mvp.csv` de `docs/anac-data/processed` e grava os dados direto dentro de `prototype/index.html`. Depois é só atualizar a página no navegador.

## Regenerar a base do CRM (opcional)

```powershell
python scripts/anac/build_catalog.py
python scripts/anac/build_crm_mvp.py
```

Atenção: esses comandos exigem os CSVs originais da ANAC em `docs/anac-data/raw`, que não estão no Git (ignorados pelo `.gitignore`). Sem eles o script não gera a base. Para só ver ou atualizar o painel, as tabelas já prontas em `processed` bastam.

## Confidencialidade

repositório privado (exigência do desafio).