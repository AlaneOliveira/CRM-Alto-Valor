# CRM Alto Valor

Projeto do Hacka Business para identificar clientes de alto valor, acompanhar a saúde do relacionamento e recomendar a próxima melhor experiência de fidelização.

## Documentação de dados

- [Guia da base de dados](docs/data/README.md): fontes, cobertura, estrutura, execução e limitações.
- [Modelo de dados](docs/data/MODELO_DE_DADOS.md): tabelas, chaves, métricas, scores e regras de recomendação.
- [Catálogo de análises](docs/data/ANALISES.md): indicadores, segmentações, perguntas e estrutura de dashboard.
- [Catálogo técnico JSON](docs/database.json) e [catálogo tabular CSV](docs/database.csv): inventário gerado das fontes ativas.

## Gerar o catálogo e o CRM do MVP

Execute na raiz do repositório:

```powershell
python scripts/anac/build_catalog.py
python scripts/anac/build_crm_mvp.py
```

As tabelas prontas para análise são gravadas em `docs/anac-data/processed`. Os testes ficam em `docs/anac-data/quality`.

## Resultado do MVP

O pipeline combina o contexto real e público da ANAC com clientes e comportamentos sintéticos. Ele entrega:

- Customer Value Score;
- Relationship Health Score;
- Churn Risk Score;
- Next Best Experience com motivo, canal, custo e uplift hipotético.

Nenhum registro representa uma pessoa real ou permite identificar passageiros da Azul.
