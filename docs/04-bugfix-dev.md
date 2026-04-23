# Cenário 4 — Bugfix em dev 👩‍🔬

**Situação:** feature mergeada em `main`, deploy automático levou para **dev**, time detectou um bug. O código **ainda não foi promovido** para staging nem production.

Filosofia: **só um PR para `main`**, sem cherry-pick. Quando a próxima promoção downstream rolar, o fix já vai junto.

```
main       ●───────●────── ← bugfix entra em main (squash)
staging    ●─────────────── (intocado — recebe na próxima promoção)
production ●───────────────
```

Esse é **o bug mais barato** — ninguém externo sente, nada foi promovido.

---

## 1) Branch de bugfix a partir de `main`

```bash
git checkout main
git pull --rebase origin main
git checkout -b bugfix/PROJ-245-saudacao-encoding
```

Fix, commit, push:

```bash
git commit -am "fix(app): corrige encoding na mensagem de saudação"
git push -u origin bugfix/PROJ-245-saudacao-encoding
```

---

## 2) PR `bugfix/* → main` — Squash and merge

CI verde, review, squash. 🟢 Deploy em **dev** com o fix.

Limpeza:

```bash
git checkout main && git pull --rebase origin main
git branch -d bugfix/PROJ-245-saudacao-encoding
```

---

## 💡 Quando vale rollback em dev?

Normalmente **não vale** — dev é ambiente de integração. Seguir com o bugfix é o caminho. Só considere reverter se a feature introduziu algo que **bloqueia o trabalho dos outros devs** e o fix vai demorar:

```bash
git checkout main && git pull --rebase origin main
git checkout -b revert/feature-problematica
git revert <sha-do-commit-problematico>
git push -u origin revert/feature-problematica
# PR → main, merge
```

---

## 📚 Diferença `bugfix` vs `fix` vs `hotfix`

**Tecnicamente são a mesma coisa** — correção de bug. A diferença é **onde o bug foi encontrado**:

| Prefixo     | Onde o bug foi visto | Precisa cherry-pick? | Urgência |
| ----------- | -------------------- | -------------------- | -------- |
| `bugfix/*`  | **dev**              | ❌ (só `main` tem)       | Baixa |
| `fix/*`     | **staging**          | ✅ para `staging`        | Média |
| `hotfix/*`  | **production**       | ✅ para `staging` e `production` + tag patch | **Alta** |

Muitos times simplificam para apenas `bugfix/*` (dev/staging) e `hotfix/*` (prod). Use o que o time preferir, **contanto que seja consistente**.

Próximo doc: [05 — Configuração do GitHub](05-configuracao-github.md) · [06 — Armadilhas comuns](06-armadilhas-e-faq.md).
