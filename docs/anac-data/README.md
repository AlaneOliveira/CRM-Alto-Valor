# Camadas de dados

- `raw/`: fontes ANAC ativas, organizadas por domínio e período; não alterar o conteúdo.
- `archive/`: exportações parciais, snapshots substituídos e arquivos fora do escopo; não consumidos pelo pipeline.
- `processed/`: tabelas analíticas do CRM, regeneradas por `scripts/anac/build_crm_mvp.py`.
- `quality/`: resultado das validações da última execução.

Os CSVs de `raw` e `archive` são mantidos localmente e ignorados pelo Git por causa do volume. O inventário versionável de todos eles está em `docs/database.json` e `docs/database.csv`.

Consulte `docs/data/README.md` para cobertura, regras de uso e comandos; `docs/data/MODELO_DE_DADOS.md` para o contrato das tabelas; e `docs/data/ANALISES.md` para as análises possíveis.
