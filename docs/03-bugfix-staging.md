# Cenário 3 — Fix em staging 🧪

**Situação:** QA testou em **staging** e encontrou um bug **antes** do código chegar em produção. O bug está em `main` e `staging`, mas **ainda não em produção**.

Filosofia: **upstream first** — fix entra em `main` primeiro, depois **cherry-pick** para staging. Cherry-pick em vez de promover `main → staging` inteiro porque `main` pode ter outras features ainda incompletas que não queremos trazer pra staging ainda.

```
main       ●───────●────────● ← fix entra em main (squash)
                   ↓ cherry-pick
staging    ●───────○────────● ← recebe só o commit do fix
production ●───────────────── (intocado)
```

---

## 1) Fix em `main` primeiro

```bash
git checkout main
git pull --rebase origin main
git checkout -b fix/PROJ-260-timeout-gateway

# aplica correção
git commit -am "fix(checkout): trata timeout do gateway de pagamento"
git push -u origin fix/PROJ-260-timeout-gateway
```

PR `fix/* → main`, CI verde, **Squash and merge**. Anote o SHA:

```bash
git checkout main
git pull --rebase origin main
git log --oneline -1
# Exemplo: a3f7b89 fix(checkout): trata timeout do gateway de pagamento
```

🟢 Deploy em **dev** com o fix.

---

## 2) Cherry-pick para `staging`

```bash
git checkout staging
git pull --rebase origin staging
git cherry-pick a3f7b89
git push origin staging
```

🟢 Deploy em **staging**. QA revalida.

### Por que **não** promover `main` inteira para staging?

Porque `main` pode ter **features incompletas** ou em teste que ainda não estão prontas para o release atual. Cherry-pick é cirúrgico: leva **só o fix**, preservando o escopo da release em staging.

Se TODAS as features em `main` também estão prontas, aí sim faça a promoção normal (`git merge --no-ff origin/main` em staging) — mas é decisão explícita.

---

## 3) Continua o fluxo normal

O fix agora está em `main` e em `staging`. Quando for hora de fechar a release, ele vai para `production` no mesmo trem do [cenário 1 — fluxo normal](01-fluxo-normal.md):

- `git merge --no-ff origin/staging` em `production`
- Bump + tag em `production`
- Push branch + tags

---

## 🚦 E se staging estiver MUITO quebrado?

Se o bug indica que a promoção anterior foi prematura:

### A — Segurar promoções e aplicar só fixes cirúrgicos

Para cada bug encontrado, fix em `main` + cherry-pick para `staging`. Não promova `main → staging` enquanto estabiliza.

### B — Reverter a promoção problemática

```bash
git checkout staging
git pull --rebase origin staging
git revert -m 1 <sha-do-merge-commit-da-promocao>
git push origin staging
```

`-m 1` preserva o "lado esquerdo" do merge (estado anterior de staging). Cria um novo commit de revert — **não reescreve histórico**.

---

## ❗ Anti-padrões

- ❌ **Commit direto em `staging`**. Sempre `main` → cherry-pick.
- ❌ **Misturar merge e cherry-pick**: decida um (ou promove tudo, ou pega um commit).

Próximo cenário: [04 — Bugfix em dev](04-bugfix-dev.md).
