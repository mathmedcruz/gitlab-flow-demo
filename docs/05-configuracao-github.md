# Guia — Configurando o GitHub para um fluxo profissional

Este guia descreve o passo a passo para transformar um repositório "cru" em um repositório com **fluxo de trabalho maduro**, respeitando o GitLab Flow com branches de ambiente.

> **Resumo:** queremos que **ninguém consiga commitar direto em `main`, `staging` ou `production`**; que **todo código passe por PR com CI verde**; que **títulos de PR sigam um padrão**; que **production exija aprovação manual**; e que **dependências desatualizadas virem PRs automáticos**.

---

## 📋 Checklist geral

Ordem recomendada de execução (todos os passos são feitos na UI do GitHub, exceto onde indicado):

- [ ] 1. Criar as branches `staging` e `production`
- [ ] 2. Proteger as 3 branches (`main`, `staging`, `production`)
- [ ] 3. Configurar os 3 Environments (`dev`, `staging`, `production`)
- [ ] 4. Exigir CODEOWNERS em PRs
- [ ] 5. Padronizar título de PR (Conventional Commits)
- [ ] 6. Configurar merge settings do repo
- [ ] 7. Ativar Dependabot + Security
- [ ] 8. (Opcional) Proteger tags `v*`

---

## 1) Criar as branches `staging` e `production`

No seu clone local:

```bash
git checkout main
git pull
git checkout -b staging && git push -u origin staging
git checkout main
git checkout -b production && git push -u origin production
```

Confirme em **Settings → Branches** que as 3 branches aparecem.

---

## 2) Proteção de branches (Rulesets)

O GitHub tem dois sistemas: **Branch protection rules** (clássico) e **Rulesets** (novo). Vamos usar **Rulesets** — mais expressivo e permite target por pattern.

No nosso modelo:

- **`main`** → exige PR (é aqui que código é revisado).
- **`staging`** e **`production`** → **não exigem PR** (promoção é `git merge` local do release manager), mas são protegidas contra push de qualquer outro usuário e contra force-push/delete.

### Caminho

**Settings → Rules → Rulesets → New ruleset → New branch ruleset**

### Ruleset #1 — "Main branch protection" (para `main`)

| Campo | Valor |
| --- | --- |
| **Ruleset name** | `Main branch protection` |
| **Enforcement status** | `Active` |
| **Target branches** → Include by pattern | `main` |
| **Bypass list** | *(vazio — nem admins devem escapar)* |

#### Regras

- ✅ **Restrict deletions**
- ✅ **Require a pull request before merging**
  - **Required approvals:** `1`
  - ✅ **Dismiss stale pull request approvals when new commits are pushed**
  - ✅ **Require review from Code Owners**
  - ✅ **Require approval of the most recent reviewable push**
  - ✅ **Require conversation resolution before merging**
- ✅ **Require status checks to pass**
  - ✅ **Require branches to be up to date before merging**
  - Status checks obrigatórios:
    - `CI / Lint & Testes`
    - `PR title lint / Valida título do PR (Conventional Commits)`
- ✅ **Block force pushes**
- ✅ **Require signed commits** *(opcional mas recomendado — ver §9)*

> ⚠️ **NÃO marque "Require linear history"** — isso força squash em todo PR. Para `feature/*/bugfix/*/hotfix/* → main` você quer squash (é o default do repo), mas o setting "Require linear history" é rígido demais e pode atrapalhar outros fluxos.

### Ruleset #2 — "Environment branches" (para `staging` e `production`)

| Campo | Valor |
| --- | --- |
| **Ruleset name** | `Environment branches` |
| **Enforcement status** | `Active` |
| **Target branches** → Include by pattern | `staging`, `production` |
| **Bypass list** | **Release managers** (role ou lista de usuários autorizados a promover) |

#### Regras

- ✅ **Restrict deletions** — ninguém deleta.
- ✅ **Block force pushes** — ninguém reescreve histórico.
- ✅ **Restrict creations** — ninguém cria branches novas com esse nome.
- ✅ **Require status checks to pass** *(opcional — rode CI no push para confirmar antes do deploy)*
- ❌ **NÃO marque "Require a pull request"** — promoção é `git merge` local.

O push só é permitido para quem está na bypass list (release managers). Qualquer outro usuário vai receber erro se tentar `git push origin staging`.

### Resumo visual

| Branch | Exige PR? | Quem pode pushar? | Force-push? | Delete? |
| --- | --- | --- | --- | --- |
| `main` | ✅ | ninguém (só via PR aprovado) | ❌ | ❌ |
| `staging` | ❌ | apenas release managers (via `git merge` local) | ❌ | ❌ |
| `production` | ❌ | apenas release managers (merge + tag) | ❌ | ❌ |

**Salve os dois rulesets.** Agora:

- `git push origin main` direto → **rejeitado** (precisa de PR).
- Dev comum tentando `git push origin staging` → **rejeitado**.
- Release manager fazendo `git merge --no-ff origin/main && git push origin staging` → **permitido**.

---

## 3) Environments (o "gate" de produção)

O que controla se o **deploy em produção** precisa de aprovação manual não é a branch protection — é o **Environment**.

### Caminho

**Settings → Environments → New environment**

Crie três: `dev`, `staging`, `production`.

### Configurações por ambiente

| Ambiente | Required reviewers | Wait timer | Deployment branches |
| --- | --- | --- | --- |
| `dev` | — | — | `main` |
| `staging` | — *(ou 1, se quiser)* | — | `staging` |
| `production` | **1 ou 2 pessoas** | 0 (ou 5 min se quiser "cooling period") | `production` |

**Deployment branches** impede, por exemplo, que alguém dispare um workflow manual apontando para `main` e, por engano, deploye para produção. Só a branch `production` pode publicar no env `production`.

Com isso, o job `deploy` do workflow `deploy-production.yml` vai **pausar** esperando o clique de aprovação.

### Secrets e variáveis por ambiente

Cada Environment tem seus próprios **Secrets** e **Variables**. Use isso para separar credenciais:

- `production` → `DATABASE_URL`, `API_KEY` reais
- `staging` → credenciais de staging
- `dev` → credenciais mock

No workflow, referencie com `${{ secrets.DATABASE_URL }}` — o GitHub injeta o valor do ambiente que o job declarou.

---

## 4) CODEOWNERS (revisão automática)

Já criamos `.github/CODEOWNERS`. Ele faz:

- Solicitar **automaticamente** revisores quando um PR toca arquivos cobertos.
- Quando combinado com **"Require review from Code Owners"** (passo 2), **bloqueia** o merge até que o owner tenha aprovado.

Ajuste o arquivo para refletir os handles reais da sua equipe (`@usuario`, `@org/time-backend`…).

---

## 5) Padronização de título de PR (Conventional Commits)

Já criamos o workflow `.github/workflows/pr-lint.yml` que valida que o título de todo PR comece com um dos prefixos: `feat`, `fix`, `hotfix`, `chore`, `docs`, `refactor`, `test`, `build`, `ci`, `perf`, `revert`.

**Configuração adicional no GitHub:**

Em **Settings → General → Pull Requests**:

- ✅ **Allow squash merging** — marque como padrão e escolha:
  - **Default commit message:** `Pull request title`
  - Garante que o commit final em `main` já venha em Conventional Commits.
- ✅ **Allow merge commits** — deixe marcado (usado se eventualmente você optar por um PR de promoção cerimonial).
- ❌ **Allow rebase merging** — desmarque (menos previsível).
- ✅ **Automatically delete head branches** — limpa branches de feature após merge.

> 💡 **Histórico resultante:** `main` fica super limpa (1 commit por feature via squash). `staging` e `production` recebem merge commits `--no-ff` gerados **localmente pelo release manager** — sem PRs intermediários.

---

## 6) Política de merge — resumo visual

| Ação                              | Via            | Estratégia       | Por quê |
| --------------------------------- | -------------- | ---------------- | ------- |
| `feature/* → main`                | PR (UI/CLI)    | **Squash merge** | 1 commit por feature, histórico limpo |
| `bugfix/* → main`                 | PR (UI/CLI)    | **Squash merge** | Idem |
| `hotfix/* → main`                 | PR (UI/CLI)    | **Squash merge** | Idem — o SHA resultante é cherry-picked |
| `main → staging` (promoção)       | **git local**  | `git merge --no-ff` | Preserva linhagem sem exigir PR |
| `staging → production` (release)  | **git local**  | `git merge --no-ff` + `git tag -a` | Idem, release em 1 ritual (tag é a versão) |
| Cherry-pick de hotfix             | **git local**  | `git cherry-pick <sha>` | Leva só o commit específico para staging e production |

---

## 7) Dependabot e segurança

Já criamos `.github/dependabot.yml`. Ele abre PRs semanalmente para:

- Dependências Python (`requirements.txt` / `requirements-dev.txt`)
- Versões de actions nos workflows

Ative também, em **Settings → Code security and analysis**:

- ✅ **Dependency graph**
- ✅ **Dependabot alerts**
- ✅ **Dependabot security updates**
- ✅ **Secret scanning** — alerta se alguém commitar credenciais.
- ✅ **Push protection** — *bloqueia* o push se detectar segredo, antes mesmo do commit chegar ao GitHub.
- ✅ **Code scanning** (CodeQL) — análise estática de segurança. Crie o workflow default.

---

## 8) Tags de release (opcional, mas profissional)

Crie um segundo **Ruleset** para tags:

**Settings → Rules → Rulesets → New ruleset → New tag ruleset**

- **Target tags** → pattern `v*`
- ✅ **Restrict deletions**
- ✅ **Restrict updates** — tags são imutáveis após criadas.

Assim uma tag `v0.2.0` nunca pode ser reescrita "em silêncio".

---

## 9) Commits assinados (opcional)

Exigir GPG/SSH signatures em commits garante autoria. Se adotar:

- Cada pessoa configura `git config --global commit.gpgsign true` e registra a chave no perfil do GitHub.
- No Ruleset, ✅ **Require signed commits**.

Para equipes iniciando o hábito, é melhor deixar como "encourage" por um mês antes de obrigar, senão vira fricção.

---

## 10) Bônus — settings úteis do repositório

Em **Settings → General**:

- **Default branch:** `main`
- ❌ **Wikis** (se não vai usar, desative — evita ruído)
- ✅ **Issues**
- ✅ **Discussions** (opcional, bom para Q&A técnico)
- **Features → Preserve this repository** — marque se for um repo arquivável.

Em **Settings → Pull Requests**:

- ✅ **Always suggest updating pull request branches** — facilita manter branches atualizadas.

---

## 🎓 Conferindo se está tudo certo

Faça este teste de fumaça depois de configurar:

1. No seu clone, tente `git push origin main` de um commit local → **deve falhar** (main exige PR).
2. Abra um PR com título inválido (ex.: `testando coisas`) → o check **PR title lint** deve falhar.
3. Abra um PR válido, merge (squash) e observe `deploy-dev` rodando automaticamente.
4. Com um usuário **fora** da bypass list, tente `git push origin staging` → **deve falhar**.
5. Com o release manager (bypass), rode:
   ```bash
   git checkout staging && git pull --rebase origin staging
   git merge --no-ff origin/main -m "chore(release): promove main → staging"
   git push origin staging
   ```
   → `deploy-staging` roda automaticamente.
6. Mesma coisa para production + `git tag -a` → `deploy-production` **pausa** esperando aprovação no Environment.

Se os 6 passos funcionam, o setup está profissional. 🎉

---

## 📎 Referências

- [Rulesets — docs oficiais](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
- [Environments e deployment protection rules](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-security/customizing-your-repository/about-code-owners)
- [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/)
- [Dependabot](https://docs.github.com/en/code-security/dependabot)
