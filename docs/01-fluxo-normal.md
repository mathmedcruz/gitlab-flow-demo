# Cenário 1 — Fluxo normal (feature → produção)

Este é o **caminho feliz**. Uma feature nasce em uma branch de trabalho, vai para `main` (deploy em **dev**), é promovida para `staging` e, por fim, promovida para `production`.

```
feature/saudacao-pt-br ──► main ──► staging ──► production
                           │          │            │
                          DEV       STAGING       PROD
```

---

## 1) Começar a feature

Sempre a partir de `main` atualizada:

```bash
git checkout main
git pull
git checkout -b feature/saudacao-pt-br
```

Faça a alteração (por exemplo, troque a mensagem em `src/app.js`):

```diff
- message: 'Olá! Este é o app de demonstração do GitLab Flow.',
+ message: 'Olá, mundo! Bem-vindo ao GitLab Flow Demo.',
```

Commit e push:

```bash
git add src/app.js
git commit -m "feat: melhora mensagem de boas-vindas"
git push -u origin feature/saudacao-pt-br
```

---

## 2) Pull Request para `main`

Abra o PR `feature/saudacao-pt-br → main`. O workflow **CI** vai rodar automaticamente nos eventos `pull_request`.

Quando o PR for aprovado e **mergeado em main**:

- 🟢 O workflow **Deploy • dev** dispara.
- 🟢 Versão `0.1.0` fica no ambiente **dev**.

---

## 3) Promover `main → staging`

Depois que a feature foi validada em dev, promovemos. Promoção **é um PR de merge**, não é cherry-pick:

```bash
git checkout staging
git pull
git merge --no-ff origin/main -m "chore(release): promove main → staging"
git push origin staging
```

> 💡 **Dica didática:** abra isso como PR `main → staging` na interface do GitHub. Isso dá visibilidade e permite que alguém aprove a promoção.

Quando o push em `staging` acontece:

- 🟢 O workflow **Deploy • staging** dispara.
- 🟢 Mesma versão agora também está em **staging**.

---

## 4) Promover `staging → production`

Mesma coisa, agora para `production`. Neste passo você normalmente:

1. Atualiza a versão em `package.json` (se seguir SemVer): `0.1.0 → 0.2.0`.
2. Atualiza o `CHANGELOG.md` movendo o que estava em `[Unreleased]` para a nova versão.
3. Abre PR `staging → production`.

```bash
# em uma branch de release opcional
git checkout staging
git pull
git checkout -b release/0.2.0
# edita package.json e CHANGELOG.md
git commit -am "chore(release): 0.2.0"
git push -u origin release/0.2.0
```

Merge do PR `release/0.2.0 → production` (ou `staging → production`, dependendo do rito da equipe).

Quando o push em `production` acontece:

- 🔒 O workflow **Deploy • production** **pausa esperando aprovação** (graças ao *required reviewer* do Environment).
- 🟢 Após aprovação, o deploy é feito.
- 🏷️ Crie a tag de release:

```bash
git checkout production
git pull
git tag -a v0.2.0 -m "Release 0.2.0"
git push origin v0.2.0
```

---

## 5) Fechar o ciclo: sincronizar versão em `main` e `staging`

Se você bumpou a versão na branch `release/*`, traga essa alteração de volta para `main` (e depois para `staging`) para que todas fiquem na mesma versão:

```bash
git checkout main
git pull
git merge --no-ff origin/production -m "chore: sincroniza main com production"
git push origin main

git checkout staging
git pull
git merge --no-ff origin/main -m "chore: sincroniza staging com main"
git push origin staging
```

> Alguns times simplificam isso usando apenas PRs `staging → production` sem branch de release, e fazem o bump direto em `main`. Ambos os modelos funcionam — escolha um e mantenha.

---

## ✅ Checagem final

| Ambiente     | Branch         | Versão |
| ------------ | -------------- | ------ |
| dev          | `main`         | 0.2.0  |
| staging      | `staging`      | 0.2.0  |
| production   | `production`   | 0.2.0  |

Tudo alinhado. Próximo cenário: [02 — Hotfix em produção](02-hotfix-producao.md).
