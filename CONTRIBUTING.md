# Contribuindo com o Jinsei

Use Node.js 24 LTS e a versão pnpm declarada no projeto. Siga a instalação do [README](README.md), mantenha `.env` privado e trabalhe em uma branch descritiva como `feat/library-filters` ou `fix/catalog-search`.

Antes de abrir um pull request, explique o comportamento alterado, acrescente verificações pertinentes e execute `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm build`. Alterações de dados/autorização ou fluxos completos também precisam dos testes de integração pertinentes. Para mudanças visuais, inclua capturas reais de desktop e mobile, sem dados pessoais.

Use commits objetivos em português, por exemplo `Feat: Adiciona filtro por favoritos` ou `Fix: Preserva o progresso ao alterar a nota`. Tipos aceitos: Feat, Fix, Refactor, Chore, Docs, Style, Test, Perf, Build, Ci e Security. Não termine o título com ponto final. Instale o hook opcional com `pnpm hooks:install`.

Mantenha autorização no servidor, validação de entrada, isolamento por usuário e os créditos das fontes de dados/imagens. Alterações de esquema devem incluir migrations; não edite migrations já aplicadas. Não versione dados de teste pessoais, segredos, dumps ou referências privadas. Preserve a licença AGPL v3 do código, os [termos adicionais de atribuição](ADDITIONAL_TERMS.md), incluindo o Buy Me a Monster com o Pix oficial do criador, e as condições dos assets.

Consulte o [Código de Conduta](CODE_OF_CONDUCT.md). Vulnerabilidades devem seguir o fluxo de [SECURITY.md](SECURITY.md).
