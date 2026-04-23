# Armadilhas comuns e FAQ

Pega-ratão do dia a dia em GitLab Flow e perguntas que todo time faz. Baseado em experiência real + guia oficial.

---

## 🪤 Armadilhas comuns

### 1. Commit direto (não-promoção) em `staging` ou `production`

**Sintoma:** alguém faz `git commit` direto em `staging`/`production` (fora do ritual `git merge --no-ff origin/...` ou `cherry-pick`) e empurra.

**Consequência:** quebra a invariante "production ⊂ staging ⊂ main". Na próxima promoção `main → staging`, o commit **some** (é sobrescrito) ou reaparece como conflito estranho. Em hotfix fica pior — pode "desaplicar" silenciosamente.

**Defesa:**
- Ruleset com **bypass list** restrita a release managers — dev comum é bloqueado no push.
- Release managers têm disciplina de usar **apenas** `git merge --no-ff origin/<upstream>` ou `git cherry-pick <sha>` (+ `git tag -a` em `production`) nessas branches. Nada de `git commit` direto.
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
- Toda terça de manhã → `git checkout staging && git merge --no-ff origin/main && git push`.
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

### 7. `git tag` esquecido na release

**Sintoma:** promoção `staging → production` foi feita e empurrada, mas o `git tag -a` ficou para trás. `/version` mostra a tag anterior (ou `dev`), `git describe` volta um hash sem tag, e o workflow de deploy que usa `github.ref_name` ou `git describe` publica com rótulo errado.

**Consequência:** monitoria, suporte e debugging ficam confusos. "Que versão está rodando?". Release notes automáticas ficam erradas. Rollback por tag fica impossível porque simplesmente não existe tag nova.

**Defesa:** tag **no mesmo ritual do merge `staging → production`** (ver [01-fluxo-normal.md §4](01-fluxo-normal.md)):

```bash
git checkout production && git pull --rebase origin production
git merge --no-ff origin/staging -m "chore(release): 0.2.0 — staging → production"
git tag -a v0.2.0 -m "Release 0.2.0"
git push origin production --tags
```

Dois comandos essenciais: `git tag -a` + `git push --tags`. Faz tudo junto, sem espaço pra esquecer. Se quiser, automatize com alias ou `make release` (e opcionalmente um hook que recusa o push em `production` sem tag anotada no HEAD).

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

### Como expor a versão em runtime

Esse é o modelo **padrão** deste projeto: **a tag git é a versão**, sem `package.json`/`pyproject.toml`/`Cargo.toml` com campo `version`. O ritual de release (ver [01-fluxo-normal.md §4](01-fluxo-normal.md)) termina em `git tag -a vX.Y.Z` + `git push --tags` — e pronto. Sem commit de bump, sem conflito de merge em arquivo de versão, sem duplicação de fonte de verdade.

A pergunta que sobra é: **como o app sabe qual versão está rodando?** (para `/version`, header HTTP, tag no Sentry, campo em log estruturado).

Duas opções, em ordem de preferência:

#### 1. Build-time (recomendado)

Injete a tag como build arg no Docker e leia via env var. Exemplo com um serviço Python (FastAPI):

```dockerfile
# Dockerfile
FROM python:3.12-slim
ARG VERSION=dev
ENV APP_VERSION=$VERSION
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

No workflow de deploy (`deploy-production.yml`), puxe a tag do git (no `production` branch, `git describe --tags --exact-match` devolve a tag recém-criada):

```yaml
- name: Resolve version
  id: v
  run: echo "version=$(git describe --tags --exact-match)" >> "$GITHUB_OUTPUT"

- name: Build image
  run: docker build --build-arg VERSION=${{ steps.v.outputs.version }} -t myapp:${{ steps.v.outputs.version }} .
```

No código da aplicação:

```python
# app/main.py
import os
from fastapi import FastAPI

APP_VERSION = os.getenv("APP_VERSION", "dev")

app = FastAPI()

@app.get("/version")
def version():
    return {"version": APP_VERSION}
```

Equivalente em Django (`settings.py` + view) ou Flask é direto — lê `os.getenv("APP_VERSION", "dev")` e devolve no endpoint/health-check. É o mesmo valor que você passa para `sentry_sdk.init(release=APP_VERSION)` e inclui no log estruturado.

#### 2. Runtime via git (só funciona se `.git` estiver no runtime)

Resolver a tag no startup com `git describe`. Funciona em dev (onde você tem `.git`), mas **só** funciona em produção se `.git` estiver presente no container — raro em imagens enxutas. Prefira build-time; use isto como fallback:

```python
# app/version.py
import os
import subprocess

def resolve_version() -> str:
    env = os.getenv("APP_VERSION")
    if env:
        return env
    try:
        return subprocess.check_output(
            ["git", "describe", "--tags", "--always"],
            stderr=subprocess.DEVNULL,
        ).decode().strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return "dev"

APP_VERSION = resolve_version()
```

**Critério do bump SemVer** (pelos Conventional Commits desde a última tag):

- só `fix:` / `refactor:` / `chore:` → **PATCH**
- algum `feat:` → **MINOR**
- breaking change (`feat!:` / `BREAKING CHANGE:`) → **MAJOR**

---

### E se meu projeto **é** um pacote publicado (PyPI, npm, crates.io)?

Aí o modelo "tag é a versão" não fecha sozinho — o registry **exige** `version` no manifest (`pyproject.toml`, `package.json`, `Cargo.toml`). Nesse caso, o fluxo do [01-fluxo-normal.md §4](01-fluxo-normal.md) ganha um passo extra entre o merge e a tag:

```bash
git checkout production && git pull --rebase origin production
git merge --no-ff origin/staging -m "chore(release): 0.2.0 — staging → production"

# passo extra: bump no manifest (pacote publicado)
poetry version 0.2.0         # ou: npm version 0.2.0 --no-git-tag-version
git commit -am "chore(release): bump para 0.2.0"

git tag -a v0.2.0 -m "Release 0.2.0"
git push origin production --tags
```

Mesmo assim, **a tag continua sendo a fonte de verdade** — o commit de bump é só pra satisfazer o registry. Mantenha-os sincronizados (CI que falha se `pyproject.toml:version` ≠ `git describe --tags --exact-match` é barato e evita o pior caso).

Regra prática pra decidir:

- **Serviço/app interno deployado por tag** (FastAPI/Django/Flask/Rails/Go atrás de Docker) → sem arquivo de versão, só tag. Fluxo padrão deste projeto.
- **Biblioteca publicada em registry público** → tag + bump no manifest.
- **Biblioteca interna consumida por outros repos via versão fixa no lockfile deles** → idem biblioteca publicada.

---

### Tenho mesmo que usar PRs para promoção?

Neste projeto, **não**. PRs são só para `main` (onde acontece review de código). Promoção `main → staging` e `staging → production` é `git merge --no-ff` local do release manager — sem PR extra, sem ritual redundante.

O guia oficial do GitLab Flow lista PR como "preferível" (gera um checkpoint revisável), mas deixa explícito que CLI é válido. Nosso modelo usa CLI porque:

- O review já foi feito no PR para `main` — promoção não adiciona valor de review.
- Menos fricção = promoções mais frequentes = staging não envelhece.
- O release manager (bypass list do ruleset) é o único autorizado a fazer, então continua auditável.

Se algum release específico merecer um checkpoint revisável (release grande, cross-team), nada impede você de abrir um PR `main → staging` **só aquele** e mergear com merge commit. Híbrido funciona.

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
