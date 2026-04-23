# Cenário 1 — Fluxo normal (feature → release em produção)

Este é o **caminho feliz** do GitLab Flow:

```
feature/x ──PR──► main ──PR──► staging ──PR──► production + tag v0.2.0
                 (dev)       (staging)       (production)
```

Tudo é PR. Promoção entre branches de ambiente também é PR — um `merge commit` (`--no-ff`) para preservar a linhagem e gerar um checkpoint revisável com changelog automático.

---

## 1) Feature em uma branch a partir de `main`

```bash
git checkout main
git pull --rebase origin main
git checkout -b feature/saudacao-pt-br
```

Faça a alteração (ex.: editar `src/app.js`), commit em Conventional Commits:

```bash
git add src/app.js
git commit -m "feat(app): melhora mensagem de boas-vindas"
git push -u origin feature/saudacao-pt-br
```

Mantenha a branch atualizada enquanto trabalha:

```bash
git fetch origin
git rebase origin/main
git push --force-with-lease
```

---

## 2) PR `feature/* → main` — **Squash and merge**

- Abra o PR via UI ou `gh pr create -B main`.
- CI verde + aprovação do reviewer.
- **Squash and merge** → 1 commit conventional em `main`.
- 🟢 Workflow **Deploy • dev** dispara automaticamente.

Limpeza:

```bash
git checkout main
git pull --rebase origin main
git branch -d feature/saudacao-pt-br
```

A branch remota some sozinha se você ativou *"Automatically delete head branches"* em Settings.

---

## 3) PR `main → staging` (promoção) — **Merge commit**

Quando for hora de candidatar uma release a QA:

- Na UI do GitHub: **Pull requests → New pull request** → base `staging`, compare `main`.
- Título: `chore(release): promove main → staging para 0.2.0` (ou "Release 0.2.0 candidate").
- O PR mostra o changelog automático: todos os commits que vão entrar.
- **Merge commit** (`--no-ff`) — **não squash** aqui. Preserva a linhagem.
- 🟢 Workflow **Deploy • staging** dispara.

Via CLI (se preferir):

```bash
gh pr create -B staging -H main \
  --title "chore(release): promove main → staging para 0.2.0" \
  --body "Release candidate 0.2.0"
# aprove e mergeie via UI (merge commit)
```

QA valida em staging (E2E, regressão, smoke). Se encontrar bug, vai para o [cenário 3 — fix em staging](03-bugfix-staging.md).

---

## 4) PR `staging → production` (release) — **Merge commit** + bump + tag

Quando QA aprovar:

### 4.1 Abra o PR de release

```bash
gh pr create -B production -H staging \
  --title "chore(release): 0.2.0" \
  --body "Release 0.2.0 — staging → production"
```

- Aprovação (2 reviewers, conforme proteção de production).
- **Merge commit** (`--no-ff`) via UI.
- 🔒 Workflow **Deploy • production** pausa esperando aprovação no Environment.
- 🟢 Após aprovação → deploy.

### 4.2 Bump de versão + tag **direto em `production`**

Após o merge, na sua máquina:

```bash
git checkout production
git pull --rebase origin production

# bump SemVer (minor: 0.1.0 → 0.2.0)
npm version 0.2.0 --no-git-tag-version
git add package.json package-lock.json
git commit -m "chore(release): bump para 0.2.0"

# tag anotada
git tag -a v0.2.0 -m "Release 0.2.0"

# push branch + tag
git push origin production --tags
```

- Tag `v0.2.0` aparece em **Tags / Releases** no GitHub.
- Gere release notes a partir da tag (UI: *Draft a new release*).

> ⚠️ **Exige permissão:** seu usuário precisa ter permissão de push em `production` (bypass da proteção, ou admin). Sem isso, você precisa abrir **outro PR** `chore/bump-0.2.0 → production` com o commit do bump — o que funciona mas adiciona cerimônia.

### 4.3 Como escolher a versão (SemVer)

Olhe os Conventional Commits que entraram em `main` desde o último release:

- Só `fix:` → **PATCH** (`0.1.1`)
- Tem `feat:` → **MINOR** (`0.2.0`)
- Tem `feat!:` ou `BREAKING CHANGE:` → **MAJOR** (`1.0.0`)

---

## ✅ Checagem final

| Ambiente     | Branch         | Versão |
| ------------ | -------------- | ------ |
| dev          | `main`         | 0.1.0  |
| staging      | `staging`      | 0.1.0  |
| production   | `production`   | 0.2.0 + tag `v0.2.0` |

`main` e `staging` ficam na versão anterior — é esperado. A versão em `main` só muda quando uma próxima release bumpar de novo em `production`.

---

## 📅 Cadência recomendada

Promoções previsíveis reduzem ansiedade do time:

- **Terça de manhã** → PR `main → staging`
- **Quinta à tarde** → PR `staging → production` (release)

Janela vazia? **Não force uma release.** A regularidade é da *janela*, não da *obrigação*.

---

## ➡️ Próximos cenários

- [02 — Hotfix em produção](02-hotfix-producao.md)
- [03 — Fix em staging](03-bugfix-staging.md)
- [04 — Bugfix em dev](04-bugfix-dev.md)
- [06 — Armadilhas comuns e FAQ](06-armadilhas-e-faq.md)
