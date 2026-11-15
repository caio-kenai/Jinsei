# Contribuindo com o Jinsei

Use Node.js 24 LTS e a versão pnpm declarada no projeto. Siga a instalação do [README](README.md), mantenha `.env` privado e trabalhe em uma branch descritiva como `feat/library-filters` ou `fix/catalog-search`.

Antes de abrir um pull request, explique o comportamento alterado, acrescente verificações pertinentes e execute `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm build`. Alterações de dados/autorização ou fluxos completos também precisam dos testes de integração pertinentes. Para mudanças visuais, inclua capturas reais de desktop e mobile, sem dados pessoais.

Use commits objetivos em português, por exemplo `Feat: Adiciona filtro por favoritos` ou `Fix: Preserva o progresso ao alterar a nota`. Tipos aceitos: Feat, Fix, Refactor, Chore, Docs, Style, Test, Perf, Build, Ci e Security. Não termine o título com ponto final. Instale o hook opcional com `pnpm hooks:install`.

Contratos de API ficam em `packages/contracts` (Zod) e são compartilhados pela API e pela interface; recompile com `pnpm --filter @jinsei/contracts build` ao alterá-los. Novas telas devem reutilizar os componentes e estilos existentes, funcionar nos temas claro e escuro, respeitar `prefers-reduced-motion` e manter foco visível e rótulos acessíveis.

A interface é traduzida para português (padrão), inglês e espanhol. Escreva os textos em português dentro de `t('…')` (de `useT()` ou `useI18n()`); variáveis usam chaves, como `t('Capa de {title}', { title })`. Textos fora de componentes, como listas de opções, usam `msg('…')` e são exibidos com `t(label)`. Mensagens de erro da API, e-mails e textos da jornada também usam o português como chave. Acrescente a tradução de cada texto novo em `packages/contracts/src/messages/en.ts` e `es.ts`; `pnpm test` aponta o que faltar.

Recursos sociais exigem cuidado redobrado: nunca exponha e-mail, anotações, tags ou títulos manuais; respeite as opções de privacidade do perfil e cubra com testes quem pode ver ou alterar cada dado. Inclua os novos dados pessoais na exportação e na exclusão de conta.

Mantenha autorização no servidor, validação de entrada, isolamento por usuário e os créditos das fontes de dados/imagens. Alterações de esquema devem incluir migrations; não edite migrations já aplicadas. Não versione dados de teste pessoais, segredos, dumps ou referências privadas. Preserve a licença AGPL v3 do código, os [termos adicionais de atribuição](ADDITIONAL_TERMS.md), incluindo o Buy Me a Monster com o Pix oficial do criador, e as condições dos assets.

As versões seguem `0.0.1` → `0.0.9` → `0.1.0`. Para preparar uma versão, rode `node scripts/version.mjs --next --write`, registre as mudanças no [CHANGELOG](CHANGELOG.md) e faça o commit `Chore: Prepara a versão X.Y.Z`. As releases publicam as imagens no GHCR e anexam o pacote self-host com `SHA256SUMS`.

Consulte o [Código de Conduta](CODE_OF_CONDUCT.md). Vulnerabilidades devem seguir o fluxo de [SECURITY.md](SECURITY.md).
