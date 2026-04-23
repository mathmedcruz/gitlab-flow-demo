# Cenário 1 — Fluxo normal (feature → release em produção)

O **caminho feliz** do GitLab Flow no modelo **"PR só para `main`"**:

```
feature/x ──PR──► main ──(git merge)──► staging ──(git merge)──► production + tag v0.2.0
                (dev)                  (staging)                 (production)
```

- Feature entra em `main` via **PR** (onde o review acontece).
- Promoção `main → staging` e `staging → production` é **`git merge --no-ff` local + push**. Sem PR extra. Sem cerimônia.
- Bump de versão + tag direto em `production` após o merge.

Isso exige que o release manager tenha permissão de push em `staging` e `production` — ver [05-configuracao-github.md](05-configuracao-github.md) para o ruleset correto.

---

## 1) Feature em uma branch a partir de `main`

```bash
git checkout main
git pull --rebase origin main
git checkout -b feature/saudacao-pt-br
```

Faça a alteração, commit em Conventional Commits:

```bash
git add src/main.py
git commit -m "feat(app): melhora mensagem de boas-vindas"
git push -u origin feature/saudacao-pt-br
```

---

## 2) PR `feature/* → main` — Squash and merge

- Abra o PR (`gh pr create -B main` ou via UI).
- CI verde + aprovação.
- **Squash and merge** → 1 commit conventional em `main`.
- 🟢 Workflow **Deploy • dev** dispara.

Limpeza:

```bash
git checkout main
git pull --rebase origin main
git branch -d feature/saudacao-pt-br
```

---

## 3) Promover `main → staging` (git merge local, sem PR)

Quando a release estiver pronta para QA:

```bash
git checkout staging
git pull --rebase origin staging
git merge --no-ff origin/main -m "chore(release): promove main → staging para 0.2.0"
git push origin staging
```

- 🟢 Workflow **Deploy • staging** dispara.
- QA valida em staging (E2E, regressão, smoke).

### Por que `--no-ff`?

Preserva o "ponto" da promoção no histórico. `git log --graph` mostra claramente **quando** `main` entrou em `staging` e **quais commits** foram juntos. Sem `--no-ff`, o merge seria fast-forward e a linhagem sumiria.

### Se QA achar bug em staging

Vai para o [cenário 3 — fix em staging](03-bugfix-staging.md): fix em `main` + cherry-pick para `staging`. **Nunca** commite direto em `staging`.

---

## 4) Promover `staging → production` + tag (git merge local, sem PR)

Quando QA aprovar:

```bash
git checkout production
git pull --rebase origin production

# 1. merge da promoção
git merge --no-ff origin/staging -m "chore(release): 0.2.0 — staging → production"

# 2. tag anotada — a tag é a versão
git tag -a v0.2.0 -m "Release 0.2.0"

# 3. push branch + tags
git push origin production --tags
```

- 🔒 Workflow **Deploy • production** pausa esperando aprovação no Environment.
- 🟢 Após aprovação → deploy em prod.
- 🏷️ Tag `v0.2.0` fica visível em **Tags / Releases** no GitHub.

> 💡 **Sem arquivo de versão, sem commit de bump.** A **tag git é a versão** — nada de `npm version` / `poetry version` / edição de manifest. Zero commit de *"chore: bump"* poluindo histórico, zero conflito de merge em arquivo de versão. Para expor a tag em runtime (endpoint `/version`, Sentry, logs), ver [06-armadilhas-e-faq.md → Como expor a versão em runtime](06-armadilhas-e-faq.md#como-expor-a-versão-em-runtime). Se seu projeto **é** um pacote publicado (PyPI/npm), ver o caso invertido no mesmo arquivo.

### Como escolher a versão (SemVer)

Olhe os Conventional Commits desde a última tag:

- Só `fix:` / `refactor:` / `chore:` → **PATCH** (`0.1.1`)
- Tem algum `feat:` → **MINOR** (`0.2.0`)
- Tem `feat!:` ou `BREAKING CHANGE:` → **MAJOR** (`1.0.0`)

---

## ✅ Checagem final

| Ambiente     | Branch         | Versão (`git describe`) |
| ------------ | -------------- | ----------------------- |
| dev          | `main`         | `v0.1.0-3-gabc123` (3 commits à frente da última tag) |
| staging      | `staging`      | `v0.1.0` (ou idem, se ficou à frente) |
| production   | `production`   | **`v0.2.0`** (tag exata) |

`main` e `staging` não têm tag nova — esperado. A nova tag só nasce em `production` no momento do push com `--tags`. `git describe --tags --always` resolve tudo sem precisar de arquivo de versão.

---

## 📅 Cadência recomendada

Previsibilidade reduz ansiedade do time:

- **Terça de manhã** → `git merge --no-ff origin/main` em `staging`.
- **Quinta à tarde** → merge + tag em `production`.

Janela vazia? **Não force uma release.** A regularidade é da *janela*, não da *obrigação*.

---

## 💡 Checkpoint opcional: PR de promoção quando quiser

Esse modelo **não exige** PR para promoção, mas nada impede você de abrir um quando for útil — por exemplo, pra ter um changelog revisável de release grande:

```bash
gh pr create -B staging -H main \
  --title "chore(release): promove main → staging para 0.2.0" \
  --body "Release candidate 0.2.0"
```

Aí mergeia pela UI com **merge commit** e segue o mesmo push de deploy. É escolha sua caso a caso.

---

## ➡️ Próximos cenários

- [02 — Hotfix em produção](02-hotfix-producao.md)
- [03 — Fix em staging](03-bugfix-staging.md)
- [04 — Bugfix em dev](04-bugfix-dev.md)
- [06 — Armadilhas comuns e FAQ](06-armadilhas-e-faq.md)
