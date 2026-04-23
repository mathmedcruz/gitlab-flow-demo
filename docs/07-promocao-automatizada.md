# Promoção manual via pipeline — sem PR de promoção

## 🎯 Ideia

O PR de promoção (`main → staging`, `staging → production`) **não revisa código** — o review já aconteceu quando o PR `feature/* → main` foi aceito. Promover é decidir **quando** levar o que já está em `main` para o próximo ambiente.

Na **boa prática do GitLab Flow**, essa decisão vira um **job manual do pipeline**: alguém autorizado clica "play" (no GitLab) ou roda `gh workflow run` (no GitHub). Isso é diferente de:

- **PR de promoção** → ritual desnecessário, já que não há código pra revisar.
- **Auto-promoção** → remove o humano de uma decisão que é de *produto* (quando), não de *qualidade* (o quê, que já foi revisado).

Neste modelo:

- **Todo código novo entra por PR para `main`** — única etapa de review.
- **Promoções são comandos humanos**, auditados no log do Actions run.
- **Production tem um gate extra** no Environment (required reviewer), que é a "segunda chave" no momento do deploy.

```
feature/* ──PR──► main ──promote──► staging ──promote──► production
                  (review)          (comando)            (comando + env approval)
```

---

## 🧰 Como acionar

O workflow `.github/workflows/promote.yml` só dispara manualmente:

### Pela CLI

```bash
# Promover main → staging
gh workflow run promote.yml -f target=staging

# Promover staging → production
gh workflow run promote.yml -f target=production

# Simular sem pushar (pra debugar)
gh workflow run promote.yml -f target=staging -f dry_run=true

# Acompanhar o run atual
gh run watch
```

### Pela UI

**Actions → Promote → Run workflow** → escolhe `target` → **Run**.

### Controle de idempotência

O workflow verifica antes de mergear se o target já contém o source (`git merge-base --is-ancestor`). Se sim, sai sem fazer nada. Você pode disparar `promote staging` 10x seguidas que só o primeiro faz alguma coisa.

---

## 🔐 Setup das permissões

Branches protegidas rejeitam push do workflow por padrão. Três caminhos, em ordem de preferência:

### Caminho 1 — GitHub App dedicado *(recomendado para orgs)*

1. Crie um GitHub App na organização com permissão **Contents: Read & write**.
2. Instale no repo.
3. Gere uma chave privada e guarde como secret `PROMOTE_APP_ID` + `PROMOTE_APP_PRIVATE_KEY`.
4. No workflow, troque o passo de checkout por um que gera token do App (ex.: `actions/create-github-app-token@v1`).
5. Adicione o App à **bypass list** do ruleset de `staging` e `production`.

Token efêmero, escopado ao repo — mais seguro.

### Caminho 2 — Personal Access Token (PAT) *(mais simples)*

1. Crie um **fine-grained PAT** em *Settings → Developer settings → Personal access tokens → Fine-grained tokens* com:
   - **Repository access:** apenas este repo.
   - **Permissions → Contents:** Read and write.
2. Salve como secret `PROMOTE_TOKEN` em *Settings → Secrets and variables → Actions*.
3. Adicione o usuário dono do PAT à **bypass list** do ruleset.

O workflow já prefere `PROMOTE_TOKEN` se ele existir.

### Caminho 3 — Afrouxar o ruleset nas branches de ambiente *(ok para demo/pessoal)*

No ruleset de `staging`/`production`, **remova** "Require a pull request before merging". Mantenha:
- ✅ Block force pushes
- ✅ Restrict deletions
- ✅ Require status checks (CI verde)
- ✅ Restrict who can push → inclua apenas `github-actions[bot]`

Assim o `GITHUB_TOKEN` padrão funciona.

---

## 🔁 Como fica cada cenário

### Fluxo normal

```bash
# 1. Feature: PR → main (review + CI). Após merge, deploy-dev roda sozinho.
git checkout -b feature/x
gh pr create -B main
# ... merge via UI (squash) ...

# 2. Promove para staging quando decidir. QA testa em staging.
gh workflow run promote.yml -f target=staging

# 3. Promove para production quando decidir lançar.
gh workflow run promote.yml -f target=production
# → workflow de deploy-production pausa no Environment → você aprova → deploy.
```

### Hotfix em produção

```bash
# 1. Fix começa em main (upstream first).
git checkout -b hotfix/bug
gh pr create -B main
# Merge → deploy-dev automático.

# 2. Promove main → staging para validar rápido.
gh workflow run promote.yml -f target=staging

# 3. Promove staging → production.
gh workflow run promote.yml -f target=production
# → aprova Environment → deploy prod.
```

**Atenção:** promover `main → staging` leva junto **tudo** que estava acumulado em `main`, não só o hotfix. Se isso for problema (ex.: tem feature meio-pronta em `main` que você não quer em prod ainda), use o plano alternativo:

- Criar branch `hotfix/apply-prod` a partir de `production`, fazer `cherry-pick` do SHA do fix (que já está em `main`), abrir PR `hotfix/apply-prod → production`. O `promotion-guard.yml` aceita esse padrão. Depois ainda promove `main → staging` normalmente quando todas as features acumuladas estiverem prontas.

### Bugfix em staging

PR `bugfix/* → main`, merge, `gh workflow run promote.yml -f target=staging`. QA re-testa.

### Bugfix em dev

PR `bugfix/* → main`, merge, deploy em dev. Staging e production só recebem quando você decidir promover.

---

## ⚠️ Notas

### Por que manual e não automático?

Promover automaticamente parece bom no papel, mas:

1. **Produção é decisão de negócio:** janela de deploy, comunicação com suporte, rollout gradual. O humano decide *quando*, não a CI.
2. **O Environment com required reviewer** protege o deploy, mas se a branch também chega automática, o reviewer vira o *único* filtro — e aprovar só por clicar é fácil. Manter a promoção manual força a leitura consciente do changelog antes.
3. **Staging** pode parecer inofensivo, mas acumular promoções automáticas atrapalha quando você quer "segurar" staging para estabilizar antes da próxima release — situação comum.

### Convivência com `promotion-guard.yml`

O `promotion-guard.yml` valida origem de **PRs** para `staging`/`production`. Neste modelo (promoção via comando), PRs de promoção não existem mais, então o guard **só roda nos casos excepcionais** (ex.: branch `hotfix/*` → `production` para cherry-pick cirúrgico). Nesses, o guard continua útil — pode deixar.

### Auditoria

Cada execução do `promote.yml` gera um Actions run com:
- **Ator** (quem disparou)
- **Timestamp**
- **SHA de origem e destino**
- **Commits incluídos na promoção** (log mostrado no step "Verificar")

Também aparece na aba **Deployments** do repo porque cada deploy cria uma entrada. Equivale — ou supera — a auditoria de PR.

---

## ✅ TL;DR para ativar

1. Escolha um caminho de token (App, PAT ou afrouxar ruleset — §Setup).
2. O workflow `promote.yml` já está no repo.
3. Teste em dry-run: `gh workflow run promote.yml -f target=staging -f dry_run=true`.
4. Se passou, rode real: `gh workflow run promote.yml -f target=staging`.
5. Quando for hora de soltar release: `gh workflow run promote.yml -f target=production` e aprove o Environment.
