# Camadas de dados

- `raw/`: fontes ANAC ativas, organizadas por domínio e período; não alterar o conteúdo.
- `archive/`: exportações parciais, snapshots substituídos e arquivos fora do escopo; não consumidos pelo pipeline.
- `processed/`: tabelas analíticas do CRM, regeneradas por `scripts/anac/build_crm_mvp.py`.
- `quality/`: resultado das validações da última execução.

Os CSVs de `raw` e `archive` são mantidos localmente e ignorados pelo Git por causa do volume. O inventário versionado de todos eles está em `data/database.json` e `data/database.csv`.

Consulte:

- `docs/README.md` para o índice geral;
- `docs/MODELO_DE_DADOS.md` para o contrato das tabelas;
- `docs/ANALISES.md` para as análises possíveis;
- `docs/PROTOTIPO_E_FUNCIONALIDADES.md` para entender como os dados aparecem na interface;
- `docs/TESTES_E_QUALIDADE.md` para as verificações do pipeline e da aplicação.
