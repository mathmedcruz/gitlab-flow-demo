# Cenário 2 — Hotfix em produção 🔥

**Situação:** produção está em `v0.2.0`, bug crítico reportado, precisa consertar **agora** sem esperar o próximo release. O bug está em `main`, `staging` e `production`.

Filosofia: **upstream first** — fix entra em `main` primeiro, depois desce via **cherry-pick** (não merge) para `staging` e `production`. Cherry-pick porque queremos levar **só** o commit do fix, não tudo que tem em `main`.

```
main       ●───────●────────● ← hotfix vira 1 commit em main (squash)
                   ↓ cherry-pick
staging    ●───────○────────● ← recebe esse commit
                   ↓ cherry-pick
production ●───────○────────● + tag patch v0.2.1
```

---

## 1) Branch de hotfix **a partir de `main`**

> ⚠️ **Não tem atalho.** Mesmo que a branch quebrada seja `production`, **parta de `main`**. Se partir de `production`, o fix não estará em `main` e a próxima promoção normal pode reintroduzir o bug.

```bash
git checkout main
git pull --rebase origin main
git checkout -b hotfix/PROJ-301-version-endpoint
```

Correção **mínima possível** — hotfix não é hora de refatorar:

```bash
git commit -am "fix(app): corrige payload do endpoint /version"
git push -u origin hotfix/PROJ-301-version-endpoint
```

---

## 2) PR `hotfix/* → main` — review acelerado, **Squash and merge**

Mesmo sob pressão: **CI verde + 1 aprovação**. Squash é essencial — resulta em **1 SHA** que vai ser cherry-pickado duas vezes.

Depois do merge, anote o SHA:

```bash
git checkout main
git pull --rebase origin main
git log --oneline -1
# Exemplo: 9a8b7c6 fix(app): corrige payload do endpoint /version
```

🟢 Deploy automático em **dev** com o fix.

---

## 3) Cherry-pick para `staging`

```bash
git checkout staging
git pull --rebase origin staging
git cherry-pick 9a8b7c6
git push origin staging
```

🟢 Deploy em **staging**. QA faz smoke rápido (~10 min) para confirmar.

> ℹ️ O push direto em `staging` só funciona para quem está na **bypass list** do ruleset (release managers). Dev comum recebe erro — é o comportamento esperado. Ver [05-configuracao-github.md](05-configuracao-github.md).

---

## 4) Cherry-pick para `production` + tag patch

```bash
git checkout production
git pull --rebase origin production
git cherry-pick 9a8b7c6

# Tag patch (0.2.0 → 0.2.1) — a tag é a versão
git tag -a v0.2.1 -m "Hotfix 0.2.1 — corrige /version"
git push origin production --tags
```

- 🔒 Workflow **Deploy • production** pausa para aprovação.
- 🟢 Após aprovação, o fix sai em **produção**.

> 💡 Sem `npm version`, sem commit de bump. A tag já é a versão — consistente com o [fluxo normal §4](01-fluxo-normal.md).

---

## 5) Limpeza

```bash
git branch -d hotfix/PROJ-301-version-endpoint
git push origin --delete hotfix/PROJ-301-version-endpoint
```

---

## Estado final

| Ambiente     | Branch         | Versão (`git describe`) | Tem o fix? |
| ------------ | -------------- | ----------------------- | ---------- |
| dev          | `main`         | `v0.2.0-1-g9a8b7c6`     | ✅ (PR merge)    |
| staging      | `staging`      | `v0.2.0-1-g...`         | ✅ (cherry-pick) |
| production   | `production`   | **`v0.2.1`** (tag exata) | ✅ (cherry-pick + tag) |

---

## ❗ Anti-padrões

- ❌ **Fix direto em `production`** sem passar por `main`.
- ❌ **Merge `main → production`** em vez de cherry-pick (leva tudo de main, não só o fix).
- ❌ **Hotfix mexendo no schema de banco** — migration destrutiva + cherry-pick = desastre. Se precisa mudar schema, não é hotfix, é release normal.

---

## 🆘 Conflito no cherry-pick?

Acontece quando `staging`/`production` divergiram demais de `main` desde a última release:

```bash
# resolva manualmente os arquivos em conflito
git add <arquivos>
git cherry-pick --continue
# teste localmente antes de pushar!
```

Conflito grande = env branches envelheceram. Faça uma promoção completa `main → staging` assim que o incidente passar.

Próximo cenário: [03 — Fix em staging](03-bugfix-staging.md).
