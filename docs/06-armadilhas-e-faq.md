# Armadilhas comuns e FAQ

Pega-ratão do dia a dia em GitLab Flow e perguntas que todo time faz. Baseado em experiência real + guia oficial.

---

## 🪤 Armadilhas comuns

### 1. Commit direto em `staging` ou `production`

**Sintoma:** alguém faz `git push origin staging` com um commit local direto.

**Consequência:** quebra a invariante "production ⊂ staging ⊂ main". Na próxima promoção `main → staging`, o commit **some** (é sobrescrito) ou reaparece como conflito estranho. Em hotfix fica pior — pode "desaplicar" silenciosamente.

**Defesa:**
- Ruleset protegendo as branches com *require PR*.
- Push direto bloqueado — tudo (inclusive promoção) passa por PR com CI verde.
- Ver [05-configuracao-github.md](05-configuracao-github.md).

---

### 2. Esquecer o cherry-pick depois do hotfix

**Sintoma:** hotfix merge-ado em `main`, sai em dev, mas prod continua quebrado.

**Consequência:** o bug que estava em prod… continua em prod. O time acha que consertou. Cliente descobre primeiro.

**Defesa:**
- **Checklist no PR de hotfix** com os SHAs: `[ ] cherry-pick para staging (SHA: ___) [ ] cherry-pick para production (SHA: ___) [ ] tag patch`.
- O template de PR deste projeto ([`.github/pull_request_template.md`](../.github/pull_request_template.md)) já tem uma seção "Plano de cherry-pick" pra hotfix.

---

### 3. Cherry-pick de vários commits de uma vez

**Sintoma:** hotfix ficou com 5 commits na branch `hotfix/*`. Depois de mergeado em main, precisa cherry-pickar os 5 em ordem para staging e production.

**Consequência:** frágil (ordem importa, conflito em cada um), dobro do risco de erro.

**Defesa:** **Squash and merge** nos PRs de trabalho. Isso transforma o PR em **1 SHA** — cherry-pick vira trivial. Já é o default configurado no GitHub Settings deste projeto.

---

### 4. Staging envelhece

**Sintoma:** passaram semanas sem `main → staging`. Quando alguém tenta cherry-pickar um hotfix, conflito grande em vários arquivos.

**Consequência:** resolução manual arriscada, staging fica "estranho", próximo release é doloroso.

**Defesa:** **cadência fixa** de promoção. Exemplo:
- Toda terça de manhã → abra PR `main → staging` (promoção).
- Mesmo que o lote seja pequeno, **promove**. Manter staging fresco é barato; re-sincronizar depois de semanas é caro.

---

### 5. Promover `main → staging` com feature incompleta

**Sintoma:** alguém decide promover para fechar uma release, mas `main` tem uma feature meio pronta (PR merge-ado acidentalmente, ou chunk dependente ainda faltando).

**Consequência:** staging vai com código quebrado. QA perde tempo, release atrasa.

**Defesa:**
- **Feature flags** — esconde o que não está pronto atrás de um toggle. Feature pode entrar em main desligada e só ser ligada quando estiver completa.
- **Segurar o merge do PR** até a feature estar de fato completa (incluindo testes).
- Quando não der, faça `git revert` da feature problemática antes de promover.

---

### 6. Usar `fix`, `bugfix` e `hotfix` inconsistentemente

**Sintoma:** time fica em dúvida: "isso é hotfix ou só um bugfix?". Alguns PRs com nome `fix/`, outros com `bugfix/`, outros com `hotfix/` sem padrão claro.

**Consequência:** o *nome* da branch deixa de sinalizar urgência/impacto. Review e deploy ficam menos previsíveis.

**Defesa:** **definir no CONTRIBUTING.md** e no template de PR:
- `hotfix/*` = **bug em produção**. Precisa cherry-pick para staging + production + tag patch.
- `bugfix/*` ou `fix/*` = bug que **ainda não** chegou em produção. Fluxo normal, sem cherry-pick especial.

Ou, mais simples ainda: **só use `bugfix/*` e `hotfix/*`**, pulando `fix/*`. Menos nomes = menos confusão.

---

### 7. `npm version` esquecido na release

**Sintoma:** release saiu em prod mas `/version` ainda mostra a versão anterior.

**Consequência:** monitoria, suporte e debugging ficam confusos. "Que versão está rodando?". Release notes automáticas ficam erradas.

**Defesa:** incluir o bump + tag como **parte do ritual de release**. Depois de mergear o PR `staging → production`, rode (ver [01-fluxo-normal.md §4.2](01-fluxo-normal.md)):

```bash
git checkout production && git pull --rebase origin production
npm version 0.2.0 --no-git-tag-version
git commit -am "chore(release): bump para 0.2.0"
git tag -a v0.2.0 -m "Release 0.2.0"
git push origin production --tags
```

Checklist no template do PR de release evita esquecimento. Bypass da proteção pro release manager faz o push direto funcionar.

---

## ❓ FAQ

### Preciso de uma branch `develop`?

Não. `main` no GitLab Flow exerce o papel que `develop` tinha no Git Flow. A branch `production` substitui `main` do Git Flow como "espelho do que está em prod". Uma branch permanente a menos.

---

### Como lidar com migrações de banco em hotfix?

**Não faça.** Hotfix não muda schema. Se precisa mudar schema, é um release normal (promoção completa), não um hotfix. Migrations destrutivas + cherry-pick é fórmula de desastre — você pode acabar com staging rodando um schema diferente de production, ou rollback que fica quebrado.

Fluxo seguro pra mudar schema: entrou em main → promoção normal → staging valida com dados reais → production.

---

### E se dois hotfixes acontecerem em paralelo?

Fluxo é o mesmo, cada um na sua branch `hotfix/*`. O segundo cherry-pick pode dar conflito no primeiro — resolva, teste, empurre. Coordene no canal de incidente pra **não cherry-pickar em cima do outro simultaneamente**. Faça um, termine, depois o outro.

---

### Quando usar `merge` vs `cherry-pick` para descer mudança?

- **Merge**: quero levar **tudo** de `main` desde o último ponto. É **promoção de release**.
- **Cherry-pick**: quero levar **só um commit específico**. É **hotfix ou fix cirúrgico**.
- **Nunca misture**: ou promove tudo, ou pega um commit. Misturar cria histórico confuso.

---

### `staging` pode ficar atrás de `production`?

Sim, **temporariamente**, se um hotfix foi cherry-pickado direto para `production` pulando `staging` (em emergências extremas). Mas você **deve** retroativamente cherry-pickar para `staging` também, para manter "production ⊂ staging ⊂ main". Senão, a próxima `main → staging` vai reintroduzir o bug.

---

### Como faço rollback em produção?

Duas opções, em ordem de velocidade:

1. **Redeploy da tag anterior** (mais rápido): se seu pipeline permite, acione o deploy da tag `v0.1.0` sem mexer em git. Prod volta ao estado anterior em minutos.
2. **Revert via git** (mais "oficial"): aplicar `git revert` no commit problemático em `main` (upstream first) e descer via cherry-pick para `staging` e `production`, igual ao fluxo de hotfix (ver [02-hotfix-producao.md](02-hotfix-producao.md)). Deixa rastro no histórico.

Em incidentes graves, faça **1 primeiro** (resolver agora) e **depois 2** (consolidar com rastro).

---

### Uso SemVer mesmo sem múltiplas versões em produção?

Sim. Mesmo com uma versão em prod, SemVer dá **significado**:

- `PATCH` (`0.2.1`) = fix/hotfix
- `MINOR` (`0.2.0`) = feature nova, retrocompatível
- `MAJOR` (`1.0.0`) = breaking change

Ajuda o time, stakeholders, release notes, changelogs automáticos. Zero custo e alto valor.

---

### Tenho mesmo que usar PRs para promoção?

Sim — é a recomendação do guia oficial do GitLab Flow. PRs de promoção (`main → staging`, `staging → production`) geram **checkpoints revisáveis** com changelog automático dos commits entrando, e ficam como histórico de "quando promovemos o quê". Use **merge commit** (`--no-ff`) nessas promoções, não squash.

Em times muito maduros, algumas equipes automatizam isso via workflow — mas é otimização, não o ponto de partida. Comece com PRs, sempre.

---

### E se o time vem de Git Flow?

Migração é suave, ~1 sprint:

1. Renomeie `develop → main`.
2. Crie `staging` e `production` a partir de `main`.
3. Pare de criar `release/*` e `hotfix/*` no estilo Git Flow — troque por promoções + cherry-picks.
4. Atualize as proteções de branch (ruleset novo).
5. Treinamento curto com o time sobre *upstream first*.

Em 2 semanas o time está confortável.

---

### Resumo de uma linha

> **Tudo começa em `main`. Se o bug está em prod, cherry-pick desce. Se é release planejado, merge desce. Env branches são só espelhos do que `main` já sancionou.**
