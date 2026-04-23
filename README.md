# GitLab Flow Demo 🚀

Projeto didático para demonstrar o **GitLab Flow com branches de ambiente** usando **GitHub Actions** para simular deploys em **dev**, **staging** e **production**.

O foco não é a aplicação em si (um FastAPI bem simples), e sim **como o código promove entre os ambientes** e **como lidar com bugs encontrados em cada um deles**.

---

## 🎯 Objetivo

Permitir que você explique e pratique:

1. Como funciona o **GitLab Flow** na variante de *environment branches*.
2. Como é o **caminho feliz** de uma feature: da branch de trabalho até production.
3. Como tratar bugs encontrados em **dev**, **staging** e **production** respeitando o princípio **upstream first**.

---

## 🌳 Modelo de branches

```
         feature/*  ──┐
                      ▼
              ┌──────────────┐
              │     main     │  ──►  deploy automático em DEV
              └──────┬───────┘
                     │ merge de promoção
                     ▼
              ┌──────────────┐
              │   staging    │  ──►  deploy automático em STAGING
              └──────┬───────┘
                     │ merge de promoção
                     ▼
              ┌──────────────┐
              │  production  │  ──►  deploy automático em PRODUCTION
              └──────────────┘
```

| Branch        | Ambiente    | Como chega código lá                              | Trigger do workflow            |
| ------------- | ----------- | ------------------------------------------------- | ------------------------------ |
| `main`        | dev         | PR de `feature/*` / `bugfix/*` / `hotfix/*`       | `push` em `main`               |
| `staging`     | staging     | `git merge --no-ff origin/main` local + `push`    | `push` em `staging`            |
| `production`  | production  | `git merge --no-ff origin/staging` + `git tag -a` | `push` em `production`         |

> **PR só para `main`.** Promoção entre branches de ambiente é `git merge` local do release manager. Zero PRs extras de promoção.

**Regra de ouro (upstream first):** todo código entra primeiro em `main` e só depois *flui para baixo* (`main → staging → production`). Isso garante que **o que está em produção sempre existe em staging e em main** — nunca o contrário.

---

## 🏗️ Estrutura do projeto

```
.
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                    # Testes em PRs e pushes
│   │   ├── pr-lint.yml               # Valida título do PR (Conventional Commits)
│   │   ├── deploy-dev.yml            # Deploy ao dar push em main
│   │   ├── deploy-staging.yml        # Deploy ao dar push em staging
│   │   └── deploy-production.yml     # Deploy ao dar push em production
│   ├── ISSUE_TEMPLATE/               # Templates de bug e feature
│   ├── CODEOWNERS                    # Revisores automáticos
│   └── pull_request_template.md      # Template de PR
├── src/main.py                       # App FastAPI minimalista
├── tests/test_main.py                # Testes básicos (pytest + TestClient)
├── docs/
│   ├── 01-fluxo-normal.md            # Caminho feliz: feature → prod
│   ├── 02-hotfix-producao.md         # Bug descoberto em PROD
│   ├── 03-bugfix-staging.md          # Bug descoberto em STAGING
│   ├── 04-bugfix-dev.md              # Bug descoberto em DEV
│   ├── 05-configuracao-github.md     # Proteções, rulesets e environments
│   └── 06-armadilhas-e-faq.md        # Pega-ratão comum + FAQ
├── CHANGELOG.md
├── requirements.txt                  # Runtime (fastapi, uvicorn)
├── requirements-dev.txt              # + pytest, httpx
└── README.md
```

> Não há `pyproject.toml` com campo `version` de propósito — a **tag git é a versão** (ver [docs/06 → Como expor a versão em runtime](docs/06-armadilhas-e-faq.md#como-expor-a-versão-em-runtime)).

---

## 🧪 Rodando localmente

```bash
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt

pytest                               # roda os testes
APP_ENV=local uvicorn src.main:app --port 3000 --reload   # sobe em http://localhost:3000
```

Endpoints:

- `GET /` — mensagem + ambiente
- `GET /health` — health check
- `GET /version` — versão e ambiente (lê `APP_VERSION` da env, com fallback `"dev"`)

---

## ⚙️ Configuração do repositório no GitHub

O passo a passo completo (rulesets, environments, CODEOWNERS, Conventional Commits, secret scanning…) está em **[docs/05-configuracao-github.md](docs/05-configuracao-github.md)**.

Versão curta depois do `git push`:

1. Crie as branches `staging` e `production` a partir de `main`.
2. Em **Settings → Rules → Rulesets**, crie **dois** rulesets:
   - **"Main branch protection"** → target `main` → exige PR, CI verde, Code Owners, block force push, restrict delete.
   - **"Environment branches"** → target `staging` e `production` → **sem PR obrigatório**, block force push, restrict delete, **bypass list = release managers** (só eles podem pushar).
3. Em **Settings → Environments**, crie `dev`, `staging`, `production` — marque *Required reviewers* em `production` (gate manual para deploy em prod).
4. Em **Settings → General**, marque *Automatically delete head branches*. Habilite **squash merging** (default para features) e **merge commits** (para quando quiser abrir PR de promoção opcionalmente).

---

## 📚 Cenários (leia nesta ordem)

1. **[Fluxo normal — feature até produção](docs/01-fluxo-normal.md)**
2. **[Hotfix: bug em produção](docs/02-hotfix-producao.md)**
3. **[Bugfix: bug em staging](docs/03-bugfix-staging.md)**
4. **[Bugfix: bug em dev](docs/04-bugfix-dev.md)**
5. **[Configuração profissional do GitHub (rulesets, environments, CODEOWNERS…)](docs/05-configuracao-github.md)**
6. **[Armadilhas comuns e FAQ](docs/06-armadilhas-e-faq.md)**

---

## 🧠 As 3 regras do GitLab Flow

1. **Upstream first** — toda mudança (feature, bugfix, hotfix) entra em `main` **antes** de qualquer branch de ambiente. Nenhuma exceção.
2. **Merges fluem para baixo** — `main → staging → production`. Nunca o contrário. Branches de ambiente não recebem commits diretos, só merges (promoção) ou cherry-picks (hotfix).
3. **Cada branch de ambiente = 1 ambiente real** — push/merge naquela branch dispara deploy automático. Sem mapeamento indireto.

### Corolários práticos

- **Promoção é `merge`; hotfix é `cherry-pick`.** Nunca misture.
- **Tag anotada** (`git tag -a vX.Y.Z`) acontece **em `production`** no momento da release (ou no cherry-pick de hotfix). **A tag git é a versão** — sem arquivo de versão no repo, sem commit de bump, sem `npm version` / `poetry version`. Para expor a tag em runtime (`/version`, Sentry, logs), ver [docs/06 → Como expor a versão em runtime](docs/06-armadilhas-e-faq.md#como-expor-a-versão-em-runtime).
- **`main` reflete "o que está em prod"** até a próxima release mudar isso.
- **Nomenclatura clara**: `feature/*`, `bugfix/*` (bug em dev/staging), `hotfix/*` (bug em prod).

### Resumo de uma linha

> **Tudo começa em `main`. Se o bug está em prod, cherry-pick desce. Se é release planejado, merge desce. Env branches são só espelhos do que `main` já sancionou.**

---

## 📝 Licença

MIT — veja `LICENSE` (ou adicione um, se for publicar).
