# Modelo simplificado — "só PR para main, resto é promoção"

## 🎯 A regra em uma frase

> **Código novo só entra pelo portão da frente (`main`). As outras branches (`staging`, `production`) são apenas espelhos de promoção — ninguém abre PR ali com mudanças inéditas.**

Essa é a forma mais segura e legível do GitLab Flow com branches de ambiente. Ela diminui a superfície para erro humano e concentra **todo o review de código** em um único lugar: o PR para `main`.

---

## 🌳 Matriz de PRs permitidos

| De                          | Para         | O que é      | Tipo de merge   |
| --------------------------- | ------------ | ------------ | --------------- |
| `feature/*`                 | `main`       | Feature      | Squash          |
| `bugfix/*`                  | `main`       | Bugfix       | Squash          |
| `hotfix/*`                  | `main`       | Hotfix (parte 1 — upstream first) | Squash          |
| `main`                      | `staging`    | **Promoção** | Merge commit    |
| `staging`                   | `production` | **Promoção/release** | Merge commit    |
| `release/*` (de `staging`)  | `production` | Release "corada" com bump de versão | Merge commit |
| `hotfix/*` (cherry-pick de `main`) | `production` | Hotfix (parte 2 — aplica em prod) | Merge commit |

Qualquer outra combinação é **rejeitada automaticamente** pelo workflow `promotion-guard.yml`.

---

## 🛡️ Como isso fica seguro

Três camadas que trabalham juntas:

### 1. Ruleset bloqueia push direto

`main`, `staging` e `production` exigem PR. Ninguém consegue `git push` nelas. *(Já configurado em [05-configuracao-github.md](05-configuracao-github.md).)*

### 2. Promotion Guard valida origem do PR

O workflow `.github/workflows/promotion-guard.yml` roda em todo PR cujo base é `staging` ou `production` e rejeita se a branch de origem **não for uma das permitidas**.

Exemplo do que acontece se alguém tentar burlar:

```
PR: feature/adiciona-x → production

❌ PR rejeitado pelo Promotion Guard.

As branches de ambiente só aceitam promoções pré-definidas:
  • staging     ← main
  • production  ← staging | release/* | hotfix/*
```

Combinado com **required status checks** na branch de destino, o merge fica **impossível** até a regra ser respeitada.

### 3. Environments protegem o deploy

Mesmo que alguém conseguisse mergear (não consegue, mas em teoria), o workflow `deploy-production` **pausa** esperando aprovação manual do reviewer do environment `production`.

São 3 portas: **ruleset** → **guard** → **environment approval**. Para algo chegar em prod errado, as três teriam que falhar juntas.

---

## 🔁 Como cada cenário muda neste modelo

### Fluxo normal (cenário 1)
**Igual ao cenário já descrito** em [01-fluxo-normal.md](01-fluxo-normal.md). Os PRs são `feature/* → main`, depois `main → staging`, depois `staging → production` (ou `release/* → production`). Todos ok no guard.

### Hotfix em produção (cenário 2)
Agora o fluxo ganha **clareza obrigatória**:

1. `hotfix/x → main` (PR com review + CI) → merge → deploy-dev.
2. Criar branch a partir de `production`:
   ```bash
   git checkout production && git pull
   git checkout -b hotfix/x-apply-prod
   git cherry-pick <sha-do-hotfix-em-main>
   git push -u origin hotfix/x-apply-prod
   ```
3. PR `hotfix/x-apply-prod → production`. O guard aceita porque a branch começa com `hotfix/`.
4. Mesmo passo para staging:
   ```bash
   git checkout staging && git pull
   git checkout -b hotfix/x-apply-stg
   git cherry-pick <sha-do-hotfix-em-main>
   git push -u origin hotfix/x-apply-stg
   ```
5. PR `hotfix/x-apply-stg → staging`... **espera**, o guard só aceita `main → staging`.

Pra não complicar, a recomendação para **staging** nesse modelo é:
- Não usar branch de cherry-pick para staging — apenas **mergear main em staging** depois que o hotfix estiver em `main`. Isso é o PR `main → staging` padrão.
- Production fica com a branch `hotfix/*` porque a situação é urgente e staging talvez ainda não tenha sido promovida.

Alternativa: se quiser que staging também aceite `hotfix/*` diretamente, **ajuste o guard** (veja §Ajustes abaixo).

### Bugfix em staging (cenário 3)
Inalterado: fix em `main`, PR `main → staging`. O guard aceita.

### Bugfix em dev (cenário 4)
Inalterado: fix em `main`, nada muda em staging/production até a próxima promoção normal.

---

## 🛠️ Ajustes opcionais do guard

O arquivo `.github/workflows/promotion-guard.yml` é seu — ajuste à política do time:

**Aceitar `hotfix/*` também em staging:**
```yaml
staging)
  if [[ "$HEAD" == "main" ]] || [[ "$HEAD" == hotfix/* ]]; then
    valid=true
  fi
  ;;
```

**Aceitar só `release/*` em production (forçando que toda release tenha bump de versão):**
```yaml
production)
  if [[ "$HEAD" == release/* ]] || [[ "$HEAD" == hotfix/* ]]; then
    valid=true
  fi
  ;;
```

**Exigir nomeação de branch de promoção específica (ex.: `promote/main-to-staging`):**
```yaml
staging)
  if [[ "$HEAD" == "main" ]] || [[ "$HEAD" == promote/main-* ]]; then
    valid=true
  fi
  ;;
```

---

## 🔁 Evoluindo: promover sem abrir PR

Se o PR de promoção virar cerimonial demais, o próximo passo natural é **eliminar** esses PRs e promover por comando: `gh workflow run promote.yml -f target=staging`. Veja [07-promocao-automatizada.md](07-promocao-automatizada.md) — esse doc complementa este e mostra como fazer com segurança (token com bypass, Environment como gate final).

## ✅ Para ativar isso no seu repositório

1. O workflow `promotion-guard.yml` já está no projeto.
2. Em **Settings → Rules → Rulesets**, abra o ruleset das branches de ambiente (criado em [05](05-configuracao-github.md)) e adicione à lista de **required status checks**:
   ```
   Promotion guard / Valida origem do PR de promoção
   ```
3. Feito. Qualquer PR com origem errada vai falhar esse check e o merge fica travado.

---

## 🧠 Por que esse modelo ensina bem

- **Mentalidade única de revisão:** "review de código" vira sinônimo de "PR para main". Simples.
- **Promoção é um evento cerimonial:** o PR `main → staging` e `staging → production` existe para **decidir quando promover**, não para revisar código. Deixa claro o momento em que você está tomando uma decisão de produto/risco, não de código.
- **Rastreabilidade óbvia:** se algo quebrou em prod, o diff do PR de promoção mostra exatamente o conjunto de features que entraram — diferente de uma branch onde commits individuais entram no meio.
- **Impossível "trapacear":** sem o guard, um dev apressado pode abrir PR direto para `production`. Com o guard, isso falha visivelmente.
