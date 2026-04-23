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
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                    # Testes em PRs e pushes
│   │   ├── pr-lint.yml               # Valida título do PR (Conventional Commits)
│   │   ├── deploy-dev.yml            # Deploy ao dar push em main
│   │   ├── deploy-staging.yml        # Deploy ao dar push em staging
│   │   └── deploy-production.yml     # Deploy ao dar push em production
│   ├── ISSUE_TEMPLATE/               # Templates de bug e feature
│   ├── CODEOWNERS                    # Revisores automáticos
│   ├── dependabot.yml                # Atualizações de deps automáticas
│   └── pull_request_template.md      # Template de PR
├── src/app.js                        # App Express minimalista
├── test/app.test.js                  # Testes básicos
├── docs/
│   ├── 01-fluxo-normal.md            # Caminho feliz: feature → prod
│   ├── 02-hotfix-producao.md         # Bug descoberto em PROD
│   ├── 03-bugfix-staging.md          # Bug descoberto em STAGING
│   ├── 04-bugfix-dev.md              # Bug descoberto em DEV
│   └── 05-configuracao-github.md     # Proteções, rulesets e environments
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

O passo a passo completo (rulesets, environments, CODEOWNERS, Conventional Commits, Dependabot, secret scanning…) está em **[docs/05-configuracao-github.md](docs/05-configuracao-github.md)**.

Versão curta depois do `git push`:

1. Crie as branches `staging` e `production` a partir de `main`.
2. Em **Settings → Rules → Rulesets**, crie um ruleset para `main`, `staging` e `production` com: require PR, require CI + `PR title lint`, require linear history, require Code Owners review, block force pushes, restrict deletions.
3. Em **Settings → Environments**, crie `dev`, `staging`, `production` — marque *Required reviewers* em `production` (é o gate manual para deploy em prod).
4. Em **Settings → General**, marque *Automatically delete head branches* e configure squash merge como default com "Pull request title" como commit message.

---

## 📚 Cenários (leia nesta ordem)

1. **[Fluxo normal — feature até produção](docs/01-fluxo-normal.md)**
2. **[Hotfix: bug em produção](docs/02-hotfix-producao.md)**
3. **[Bugfix: bug em staging](docs/03-bugfix-staging.md)**
4. **[Bugfix: bug em dev](docs/04-bugfix-dev.md)**
5. **[Configuração profissional do GitHub (rulesets, environments, CODEOWNERS…)](docs/05-configuracao-github.md)**

---

## 🧠 Princípios que os cenários reforçam

- **Upstream first:** toda correção começa em `main` e desce.
- **Promoção é *merge*, não cherry-pick.** Cherry-pick só é usado em hotfixes quando precisamos puxar um commit "para cima" (voltar para `main`) ou quando não queremos levar tudo que está em `main` para um ambiente inferior.
- **Production é imutável exceto por promoção:** só chega em production o que passou por staging.
- **Tags de release** (`vX.Y.Z`) vivem em `production`.

---

## 📝 Licença

MIT — veja `LICENSE` (ou adicione um, se for publicar).
