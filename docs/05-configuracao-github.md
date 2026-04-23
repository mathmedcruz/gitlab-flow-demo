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

O GitHub tem dois sistemas: **Branch protection rules** (clássico) e **Rulesets** (novo). Vamos usar **Rulesets** — é mais expressivo e permite aplicar a várias branches de uma vez.

### Caminho

**Settings → Rules → Rulesets → New ruleset → New branch ruleset**

### Ruleset #1 — "Protected environment branches" (para `main`, `staging`, `production`)

Configure assim:

| Campo | Valor |
| --- | --- |
| **Ruleset name** | `Protected environment branches` |
| **Enforcement status** | `Active` |
| **Target branches** → Add target → Include by pattern | `main`, `staging`, `production` (um por vez) |
| **Bypass list** | *(deixe vazio — nem admins devem escapar)* |

#### Regras a marcar

- ✅ **Restrict deletions** — ninguém deleta essas branches.
- ✅ **Require linear history** — proíbe merge commits com múltiplos parents não esperados; força PRs limpos.
- ✅ **Require a pull request before merging**
  - **Required approvals:** `1` (ou `2` se a equipe for maior)
  - ✅ **Dismiss stale pull request approvals when new commits are pushed**
  - ✅ **Require review from Code Owners**
  - ✅ **Require approval of the most recent reviewable push**
  - ✅ **Require conversation resolution before merging**
- ✅ **Require status checks to pass**
  - ✅ **Require branches to be up to date before merging**
  - Status checks obrigatórios:
    - `CI / Lint & Testes`
    - `PR title lint / Valida título do PR (Conventional Commits)`
    - `Promotion guard / Valida origem do PR de promoção` *(só aparece em PRs para staging/production — adicione mesmo assim, o GitHub valida apenas quando o check tem relevância)*
- ✅ **Block force pushes**
- ✅ **Require signed commits** *(opcional mas recomendado — ver §9)*

**Salve.** Agora é **impossível** fazer `git push origin main` direto — só via PR aprovado com CI verde.

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
  - Isso garante que, ao fazer squash merge, o commit final em `main` já venha no formato Conventional Commits — perfeito para gerar changelog automático depois.
- ❌ **Allow merge commits** — desmarque *para PRs de feature*, mas…
- ✅ **Allow merge commits** — mantenha marcado **se** você usa PRs de promoção (`main → staging`, `staging → production`). Nesses PRs, você quer **merge commit**, não squash, para preservar o histórico de features individuais.
- ❌ **Allow rebase merging** — desmarque (menos previsível).
- ✅ **Automatically delete head branches** — limpa branches de feature após merge.

> 💡 **Dica de organização:** como squash merge é o padrão pra features, o histórico em `main` fica limpo — um commit por PR. Já as promoções (`main → staging`, `staging → production`) usam merge commit com `--no-ff` e preservam a linhagem.

---

## 6) Política de merge — resumo visual

| Tipo de PR                      | Estratégia       | Por quê                                              |
| ------------------------------- | ---------------- | ---------------------------------------------------- |
| `feature/* → main`              | **Squash merge** | Histórico de `main` limpo, 1 commit por feature      |
| `bugfix/* → main`               | **Squash merge** | Idem                                                 |
| `hotfix/* → main`               | **Squash merge** | Idem — o SHA resultante é que será cherry-picked     |
| `main → staging` (promoção)     | **Merge commit** | Preservar linhagem de quais commits foram promovidos |
| `staging → production` (release)| **Merge commit** | Idem — também facilita rastrear qual release levou o quê |
| `release/* → production`        | **Merge commit** | Idem                                                 |

---

## 7) Dependabot e segurança

Já criamos `.github/dependabot.yml`. Ele abre PRs semanalmente para:

- Dependências npm
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

1. No seu clone, tente `git push origin main` de um commit local → **deve falhar** com mensagem de protected branch.
2. Abra um PR com título inválido (ex.: `testando coisas`) → o check **PR title lint** deve falhar.
3. Abra um PR válido, merge e observe `deploy-dev` rodando automaticamente.
4. Abra PR `main → staging`, merge, e observe `deploy-staging` rodando.
5. Abra PR `staging → production`, merge, e observe `deploy-production` **pausando** esperando sua aprovação.

Se os 5 passos funcionam, o setup está profissional. 🎉

---

## 📎 Referências

- [Rulesets — docs oficiais](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
- [Environments e deployment protection rules](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-security/customizing-your-repository/about-code-owners)
- [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/)
- [Dependabot](https://docs.github.com/en/code-security/dependabot)
