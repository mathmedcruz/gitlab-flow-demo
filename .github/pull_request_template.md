## 📌 O quê

<!-- Resumo curto do que este PR faz. 1–3 frases. -->

## 🤔 Por quê

<!-- Qual o problema ou necessidade que motivou esta mudança? -->

Closes #

## 🧪 Como testei

<!-- Passos para reproduzir o teste manual, evidências, screenshots. -->

- [ ] Rodei `pytest` localmente
- [ ] Testei manualmente em dev
- [ ] Screenshots / logs anexados (se aplicável)

## 🚦 Tipo da mudança

- [ ] 🐛 Bugfix
- [ ] ✨ Feature
- [ ] ♻️ Refactor (sem mudança de comportamento)
- [ ] 📝 Docs
- [ ] 🔧 Chore / build / CI
- [ ] 🔥 Hotfix (depois do merge, será cherry-picked para `staging` e `production`)

> 💡 Todo PR vai para **`main`**. Promoções `main → staging` e `staging → production` são `git merge --no-ff` local do release manager — sem PR.

## ✅ Checklist

- [ ] O título do PR segue [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/) (`feat:`, `fix:`, `chore:`, `docs:`…)
- [ ] Atualizei `CHANGELOG.md` (se a mudança for relevante pro usuário)
- [ ] Atualizei documentação em `docs/` (se aplicável)
- [ ] CI está verde
