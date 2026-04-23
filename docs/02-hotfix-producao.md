# Cenário 2 — Hotfix em produção 🔥

**Situação:** o app está em produção, alguém abre um ticket crítico (ex.: `/version` quebrado em produção) e você **precisa corrigir rápido**.

O desafio é respeitar o **upstream first** sem atrasar o conserto.

---

## Estratégia recomendada: fix em `main` + cherry-pick para `production`

Essa é a forma mais segura. Garante que o fix **nunca some** quando promoções futuras sobrescreverem production.

### 1) Criar branch de hotfix a partir de `main`

```bash
git checkout main
git pull
git checkout -b hotfix/version-endpoint
```

Faça o fix (ex.: corrigir `/version` em `src/app.js`), commit:

```bash
git commit -am "fix: corrige payload do endpoint /version"
git push -u origin hotfix/version-endpoint
```

### 2) PR para `main` (fluxo normal, com CI)

- Abre PR `hotfix/version-endpoint → main`.
- CI roda, reviewer aprova, **merge**.
- 🟢 Deploy automático em **dev**.

Anote o **SHA do commit de merge em main** — você vai precisar dele:

```bash
git checkout main
git pull
git log -1 --pretty=format:%H   # <-- guarde esse SHA, ex: abc1234
```

### 3) Cherry-pick para `production`

```bash
git checkout production
git pull
git cherry-pick abc1234
```

Se houver conflito (raro em hotfix pequeno), resolva e `git cherry-pick --continue`.

Abra o PR `production ← cherry-pick` ou faça o push direto (dependendo da proteção configurada):

```bash
git push origin production
```

- 🔒 Workflow **Deploy • production** pausa para aprovação.
- 🟢 Após aprovação, o fix sai em **produção**.

### 4) Cherry-pick para `staging` (ou aguardar a próxima promoção)

Para manter staging coerente com production imediatamente:

```bash
git checkout staging
git pull
git cherry-pick abc1234
git push origin staging
```

- 🟢 Deploy automático em **staging**.

### 5) Tag do hotfix

```bash
git checkout production
git pull
git tag -a v0.2.1 -m "Hotfix 0.2.1 — corrige /version"
git push origin v0.2.1
```

Atualize o `CHANGELOG.md` na sua próxima entrada em `main`.

---

## Estado final

| Ambiente     | Branch         | Tem o fix? |
| ------------ | -------------- | ---------- |
| dev          | `main`         | ✅ (PR merge)  |
| staging      | `staging`      | ✅ (cherry-pick) |
| production   | `production`   | ✅ (cherry-pick) |

---

## ❗ Anti-padrão (não faça isso)

- ❌ **Fazer o fix direto em `production`** e nunca levar para `main`.
  > Resultado: na próxima promoção normal, o fix some porque `main` não o tem.
- ❌ **Fazer o fix a partir de `production` e dar merge em `main`.**
  > Funciona, mas traz para `main` todo o estado que está em production — incluindo commits antigos que não voltavam sozinhos. Use cherry-pick quando quiser mover **um commit específico** entre branches de ambiente.

---

## 🧠 Por que cherry-pick (e não merge) para hotfix?

Porque `main` costuma estar **à frente** de `production`. Se você mergear `main → production` para levar o hotfix, vai levar junto **tudo que estava em main mas ainda não promovido** — o que pode quebrar prod. O cherry-pick leva **só o commit do fix**.

Já no sentido `production → main`, o merge é seguro porque `main` é quem está à frente — mas quando o hotfix **começou em main**, você não precisa desse merge: `main` já tem o commit.

Próximo cenário: [03 — Bug em staging](03-bugfix-staging.md).
