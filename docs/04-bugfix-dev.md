# Cenário 4 — Bug descoberto em dev 👩‍🔬

**Situação:** você mergeou uma feature em `main`, o deploy automático levou para **dev**, e ali mesmo o time detectou um bug. O código **ainda não foi promovido** para staging nem production.

Este é o caso **mais simples** — é praticamente o fluxo normal.

---

## Estratégia: fix em `main`, segue a vida

### 1) Criar branch de bugfix a partir de `main`

```bash
git checkout main
git pull
git checkout -b bugfix/saudacao-encoding
```

Faça o fix, commit e push:

```bash
git commit -am "fix: corrige encoding na mensagem de saudação"
git push -u origin bugfix/saudacao-encoding
```

### 2) PR para `main`

- Abre PR `bugfix/* → main`.
- CI roda, reviewer aprova, merge.
- 🟢 Deploy automático em **dev** com o fix.

### 3) Valida em dev

O time valida. Nada precisa ser feito em `staging` ou `production` ainda — o código **nunca saiu** de `main`/dev.

### 4) Quando o momento chegar, promove normalmente

Segue o [cenário 1](01-fluxo-normal.md) a partir do passo 3.

---

## 💡 Quando vale rollback em dev?

Normalmente **não vale**: dev é ambiente de integração — se estiver quebrado, o fix é seguir em frente com o bugfix. Só considere reverter se a branch de feature introduziu algo que **bloqueia o trabalho do time** (impede outras features de subirem) e o fix vai demorar.

Nesse caso, revert o merge da feature em `main`:

```bash
git checkout main
git pull
git revert -m 1 <sha-do-merge-da-feature-problematica>
git push origin main
```

- 🟢 Deploy em dev com o estado anterior.
- A feature volta para a branch original para correção.

---

## 🧠 Lição do cenário

- Bug em dev é **o bug mais barato** que existe: ninguém sente, nada foi promovido.
- Isso é exatamente o que justifica ter um ambiente de **dev sempre espelhando `main`**.
- Fluxo é sempre o mesmo: **branch → PR → main → dev**. Nunca ajuste "à mão" em dev.

---

## 🏁 Fim da série

Você passou por:

1. [Fluxo normal](01-fluxo-normal.md) — feature até produção.
2. [Hotfix em produção](02-hotfix-producao.md) — urgência + upstream first com cherry-pick.
3. [Bugfix em staging](03-bugfix-staging.md) — staging como rede de segurança.
4. Este — bugfix em dev.

Resumo em uma frase: **a correção sempre começa em `main`; o que muda é como ela chega aos ambientes abaixo**.
