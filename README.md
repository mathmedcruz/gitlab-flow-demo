# GitLab Flow Demo 🚀

Projeto didático para demonstrar o **GitLab Flow com branches de ambiente** usando **GitHub Actions** para simular deploys em **dev**, **staging** e **production**.

O foco não é a aplicação em si (um Express bem simples), e sim **como o código promove entre os ambientes** e **como lidar com bugs encontrados em cada um deles**.

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

| Branch        | Ambiente    | Como chega código lá              | Trigger do workflow            |
| ------------- | ----------- | --------------------------------- | ------------------------------ |
| `main`        | dev         | merge de `feature/*` via PR       | `push` em `main`               |
| `staging`     | staging     | merge de `main` via PR            | `push` em `staging`            |
| `production`  | production  | merge de `staging` via PR         | `push` em `production`         |

**Regra de ouro (upstream first):** todo código entra primeiro em `main` e só depois *flui para baixo* (`main → staging → production`). Isso garante que **o que está em produção sempre existe em staging e em main** — nunca o contrário.

---

## 🏗️ Estrutura do projeto

```
.
├── .github/workflows/
│   ├── ci.yml                    # Testes em PRs e pushes
│   ├── deploy-dev.yml            # Deploy ao dar push em main
│   ├── deploy-staging.yml        # Deploy ao dar push em staging
│   └── deploy-production.yml     # Deploy ao dar push em production
├── src/app.js                    # App Express minimalista
├── test/app.test.js              # Testes básicos
├── docs/
│   ├── 01-fluxo-normal.md        # Caminho feliz: feature → prod
│   ├── 02-hotfix-producao.md     # Bug descoberto em PROD
│   ├── 03-bugfix-staging.md      # Bug descoberto em STAGING
│   └── 04-bugfix-dev.md          # Bug descoberto em DEV
├── CHANGELOG.md
├── package.json
└── README.md
```

---

## 🧪 Rodando localmente

```bash
npm install
npm test                    # roda os testes
APP_ENV=local npm start     # sobe em http://localhost:3000
```

Endpoints:

- `GET /` — mensagem + ambiente
- `GET /health` — health check
- `GET /version` — versão e ambiente

---

## ⚙️ Configuração do repositório no GitHub

Depois de criar o repositório no GitHub e dar `git push`, configure:

### 1. Branches `staging` e `production`

Se ainda não existem, crie-as a partir de `main`:

```bash
git checkout main
git checkout -b staging && git push -u origin staging
git checkout main
git checkout -b production && git push -u origin production
```

### 2. Proteção de branches (*Settings → Branches*)

Para `main`, `staging` e `production`:

- ✅ Require a pull request before merging
- ✅ Require status checks to pass (selecione o job **CI / Lint & Testes**)
- ✅ Require linear history (recomendado)
- ❌ Não permitir push direto

### 3. Environments (*Settings → Environments*)

Crie três ambientes: `dev`, `staging`, `production`. Em **production**:

- ✅ Required reviewers (pelo menos 1)
- ✅ Deployment branches: somente `production`

Isso faz o deploy em prod pausar esperando aprovação manual — ótimo para ensinar o *promotion gate*.

---

## 📚 Cenários (leia nesta ordem)

1. **[Fluxo normal — feature até produção](docs/01-fluxo-normal.md)**
2. **[Hotfix: bug em produção](docs/02-hotfix-producao.md)**
3. **[Bugfix: bug em staging](docs/03-bugfix-staging.md)**
4. **[Bugfix: bug em dev](docs/04-bugfix-dev.md)**

---

## 🧠 Princípios que os cenários reforçam

- **Upstream first:** toda correção começa em `main` e desce.
- **Promoção é *merge*, não cherry-pick.** Cherry-pick só é usado em hotfixes quando precisamos puxar um commit "para cima" (voltar para `main`) ou quando não queremos levar tudo que está em `main` para um ambiente inferior.
- **Production é imutável exceto por promoção:** só chega em production o que passou por staging.
- **Tags de release** (`vX.Y.Z`) vivem em `production`.

---

## 📝 Licença

MIT — veja `LICENSE` (ou adicione um, se for publicar).
