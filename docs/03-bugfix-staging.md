# Cenário 3 — Bug descoberto em staging 🧪

**Situação:** a QA testou em **staging** e encontrou um bug **antes** do código chegar em produção. Como consertar respeitando o fluxo?

Este é o cenário **mais tranquilo** — justamente porque staging existe para isso. Produção ainda está estável.

---

## Estratégia: fix em `main`, depois re-promove

### 1) Criar branch de bugfix a partir de `main`

```bash
git checkout main
git pull
git checkout -b bugfix/validacao-json-invalido
```

Faça o fix, commit e push:

```bash
git commit -am "fix: trata payload JSON inválido sem crashar"
git push -u origin bugfix/validacao-json-invalido
```

### 2) PR para `main`

- Abre PR `bugfix/* → main`.
- CI roda, reviewer aprova, merge.
- 🟢 Deploy automático em **dev**.
- QA **valida em dev** antes de promover de novo.

### 3) Re-promover `main → staging`

Como o bug estava em staging, basta trazer a nova main:

```bash
git checkout staging
git pull
git merge --no-ff origin/main -m "chore(release): re-promove main → staging (com bugfix)"
git push origin staging
```

- 🟢 Deploy automático em **staging**.
- QA valida novamente.

### 4) Quando estiver validado, segue o fluxo normal

Continua para `production` como descrito no [cenário 1](01-fluxo-normal.md), passo 4.

---

## 🚦 E se staging estiver muito quebrado?

Às vezes um bug em staging indica que **a promoção anterior foi prematura** e staging está instável demais para continuar recebendo features. Opções:

### Opção A — Segurar promoções para staging até estabilizar

- Pare de mergear `main → staging`.
- Aplique apenas bugfixes (via cherry-pick se quiser ser cirúrgico):
  ```bash
  git checkout staging
  git cherry-pick <sha-do-bugfix-em-main>
  git push origin staging
  ```
- Só volta a promover `main` inteira quando staging estiver estável.

### Opção B — Reverter a promoção problemática

Se a promoção anterior levou vários commits ruins:

```bash
git checkout staging
git pull
git revert -m 1 <sha-do-merge-de-promocao>
git push origin staging
```

`-m 1` indica que você quer manter o "lado esquerdo" do merge (o estado anterior de staging) e descartar o "lado direito" (o que veio de main). Isso **não apaga** o merge — cria um novo commit que desfaz as mudanças. Depois você corrige em main e promove de novo.

---

## 🧠 Lição do cenário

- Staging **é o lugar certo** para encontrar bugs antes da produção.
- A correção sempre começa em `main` — nunca direto em `staging`.
- Promover = `merge --no-ff` de `main` em `staging`. Nunca commit direto.

Próximo cenário: [04 — Bug em dev](04-bugfix-dev.md).
