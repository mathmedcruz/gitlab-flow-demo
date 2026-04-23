# Promoção automatizada — sem PR de promoção

## 🎯 Ideia

O PR de promoção (`main → staging`, `staging → production`) **não revisa código** — o review já aconteceu quando o PR `feature/* → main` foi aceito. Promover é decidir **quando** levar o que já está em `main` para o próximo ambiente. Isso pode (e deve) ser um comando, não um ritual.

Neste modelo:

- **Todo código novo entra por PR para `main`** (esta é a única etapa de review).
- **Promoções viram comandos**, disparadas via `gh workflow run` ou automaticamente quando o CI fecha verde.
- **O gate manual sobrevive onde importa**: no Environment `production`, que continua exigindo aprovação **no momento do deploy**.

```
feature/* ──PR──► main ──promote──► staging ──promote──► production
                  (review)          (comando)            (comando + approval)
```

---

## 🧰 Como acionar

O workflow `.github/workflows/promote.yml` expõe duas formas de disparo:

### Manualmente, pela CLI

```bash
# Promover main → staging
gh workflow run promote.yml -f target=staging

# Promover staging → production
gh workflow run promote.yml -f target=production

# Simular sem pushar (pra debugar)
gh workflow run promote.yml -f target=staging -f dry_run=true
```

Ou clicando em **Actions → Promote → Run workflow** na UI do GitHub.

### Automaticamente

O workflow também tem um gatilho `workflow_run` que dispara **automaticamente** sempre que o workflow `CI` fecha verde em `main`. Isso significa: **todo merge em `main` → promove para `staging` sozinho**.

Para `production`, **não há** promoção automática — continua sendo um ato consciente. Se quiser ligá-la também, adicione um segundo `workflow_run` ouvindo o CI em `staging`.

### Controle de idempotência

O workflow verifica antes de mergear se o target já contém o source (`git merge-base --is-ancestor`). Se sim, ele **sai sem fazer nada** e não gera ruído. Você pode disparar `promote staging` 10x seguidas que só o primeiro faz alguma coisa.

---

## 🔐 Setup das permissões (este é o único passo chato)

Branches protegidas rejeitam push do workflow por padrão. Tem três caminhos, em ordem de preferência:

### Caminho 1 — GitHub App dedicado *(recomendado para orgs)*

1. Crie um GitHub App na organização com permissão **Contents: Read & write**.
2. Instale no repo.
3. Gere uma chave privada e guarde como secret `PROMOTE_APP_ID` + `PROMOTE_APP_PRIVATE_KEY`.
4. No workflow, troque o passo de checkout por um que gera token do App (ex.: `actions/create-github-app-token@v1`).
5. Adicione o App à **bypass list** do ruleset de `staging` e `production`.

É o modelo mais seguro porque o token é efêmero e escopado ao repo.

### Caminho 2 — Personal Access Token (PAT) *(mais simples)*

1. Crie um **fine-grained PAT** no GitHub (*Settings → Developer settings → Personal access tokens → Fine-grained tokens*) com:
   - **Repository access:** apenas este repo.
   - **Permissions → Contents:** Read and write.
2. Salve em **Settings → Secrets and variables → Actions → New repository secret** como `PROMOTE_TOKEN`.
3. Adicione o **seu usuário** (ou a conta de serviço dona do PAT) à **bypass list** do ruleset que protege `staging` e `production`.

O workflow já está configurado para preferir `PROMOTE_TOKEN` se ele existir.

### Caminho 3 — Afrouxar o ruleset nas branches de ambiente

Se é um repo pessoal/demo e você não quer setup de token, simplesmente:

1. No ruleset das branches de ambiente, **remova** "Require a pull request before merging" para `staging` e `production`. Mantenha:
   - ✅ Block force pushes
   - ✅ Restrict deletions
   - ✅ Require status checks (CI verde)
   - ✅ Restrict who can push to matching branches → inclua **apenas** `github-actions[bot]` (ou a role que o Actions usa).
2. Assim o `secrets.GITHUB_TOKEN` padrão consegue pushar.

Menos rigoroso, mas aceitável quando a porta de entrada (PR para `main`) é bem guardada.

---

## ⚠️ Notas importantes

### Sobre `workflow_run` e o primeiro ciclo

- O gatilho `workflow_run` **só dispara a partir do momento em que o arquivo do workflow está em `main`**. O primeiro merge depois de subir este workflow é quem vai "acordar" o automatismo.
- Workflows disparados por `workflow_run` **rodam como o commit padrão de `main`** e **não** passam pela revisão exigida em PR — isso é by design.

### Sobre promoção automática em production

Eu **não recomendo** ligar automação total para production. Razões:

1. O momento de promover para prod é uma decisão de negócio (janela de deploy, coordenação com time de suporte, rollout gradual).
2. O Environment `production` com required reviewer já te dá um "OK final" — mas ele só aparece *depois* que a branch foi atualizada. Se a atualização da branch também for automática, o reviewer vira a única porta — e isso é fácil de clicar sem pensar.
3. Melhor deixar `gh workflow run promote.yml -f target=production` como um ato deliberado, que você faz olhando o changelog e os dashboards.

### Convivência com o `promotion-guard.yml`

O workflow `promotion-guard.yml` (criado em [06-modelo-simplificado.md](06-modelo-simplificado.md)) valida origem de PRs para `staging`/`production`. Se você migrar 100% para promoção automatizada, o guard **fica redundante** — você pode removê-lo. Se mantiver abertura para PRs *eventuais* (ex.: cherry-pick de hotfix em production), o guard continua útil protegendo esses casos.

---

## 🔁 Como fica cada cenário

### Fluxo normal

```bash
# 1. Feature
git checkout -b feature/x
# ... edita ...
gh pr create -B main

# 2. PR mergeada em main → CI roda → auto-promote para staging → deploy staging
# (nada pra você fazer — acontece sozinho)

# 3. Quando quiser soltar a release:
gh workflow run promote.yml -f target=production
# → workflow pausa no Environment production esperando seu OK
# → você aprova → deploy em prod
```

### Hotfix em produção

```bash
# 1. Fix começa em main (upstream first)
git checkout -b hotfix/bug
# ... edita ...
gh pr create -B main
# PR mergeada → auto-promote para staging → deploy staging

# 2. Promove para production imediatamente (pula a espera)
gh workflow run promote.yml -f target=production
# → aprova o Environment → deploy prod
```

**Atenção:** como a promoção para staging é automática, você provavelmente levará *mais do que só o hotfix* para prod (tudo que estava acumulado em `main`). Se isso for problema:

- **Opção A:** desligar o `workflow_run` e promover staging também manualmente. Você recupera controle fino.
- **Opção B:** manter o modelo híbrido — quando precisar de um hotfix cirúrgico, usar branch `hotfix/*` + PR para `production` (promotion-guard aceita) em vez do workflow automático.

### Bugfix em staging

PR `bugfix/* → main`, merge, auto-promote leva pra staging. QA re-testa. Zero comando manual.

### Bugfix em dev

PR `bugfix/* → main`, merge, deploy em dev. Staging só recebe na próxima promoção (que vai acontecer automaticamente, exceto se você ainda tiver bloqueado staging por outro bug).

---

## 🤔 Prós e contras vs. PR de promoção

| Dimensão           | PR de promoção                 | Promoção automatizada               |
| ------------------ | ------------------------------ | ------------------------------------- |
| Fricção            | Alta (clicar, mergear)         | Baixa (1 comando ou automático)       |
| Auditoria          | PR com reviewers e timestamp   | Actions run com SHA, ator, timestamp  |
| Review de código   | Redundante (já foi em `main`)  | Acontece só em `main`, onde deve estar |
| Controle fino      | Bom (aceita ou não por PR)     | Bom (via `gh workflow run` e env gate) |
| Setup inicial      | Zero                           | Precisa token / bypass no ruleset     |
| Convive com hotfix? | Sim, naturalmente             | Sim, via `workflow_dispatch` ou branch |

Na prática, em times que já amadureceram o modelo, promoção automatizada ganha — e é o que você vê em companhias que fazem deploy contínuo.

---

## ✅ TL;DR para ativar

1. Escolha o caminho de token (App, PAT ou afrouxar ruleset — §Setup).
2. O workflow `promote.yml` já está no repo.
3. Teste: `gh workflow run promote.yml -f target=staging -f dry_run=true`.
4. Se passou, rode sem `dry_run` e veja staging atualizar.
5. Quando sentir confiança, decida se quer ligar o `workflow_run` automático (ele já vem ligado no arquivo — remova o trigger se preferir manual).
