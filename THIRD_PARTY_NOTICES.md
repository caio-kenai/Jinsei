# Créditos e componentes de terceiros

O código do Jinsei usa GNU AGPL v3, conforme [LICENSE](LICENSE), com os [termos adicionais de atribuição](ADDITIONAL_TERMS.md) da seção 7. As dependências mantêm suas próprias licenças; consulte os arquivos LICENSE dos pacotes e `pnpm-lock.yaml` para as versões instaladas.

- Inter e Plus Jakarta Sans: SIL Open Font License 1.1. Cópias dos avisos são distribuídas em `apps/web/public/licenses/` junto da aplicação. As fontes são servidas localmente, sem consulta ao Google Fonts no navegador.
- Ícones Lucide: ISC, distribuídos pelo pacote `lucide-react`.
- Ícones das plataformas na página de downloads (Windows, Apple, Linux e Android): Font Awesome Free, ícones sob CC BY 4.0, distribuídos pelo pacote `react-icons` (MIT). As marcas pertencem aos respectivos titulares e indicam apenas para qual sistema cada instalador serve.
- Animações, gráficos e interações da interface: `motion`, `recharts`, `@dnd-kit/*`, `sonner` e `date-fns`, todos sob licença MIT. Efeitos visuais inspirados em catálogos públicos de componentes foram reescritos no próprio projeto.
- Logotipo Jinsei e arte Buy Me a Monster: arquivos fornecidos pelo proprietário do projeto, preservados sem redesenho. Não há declaração de cessão de marcas de terceiros ou licença independente desses assets nesta versão.
- Metadados e capas dos catálogos: atribuição por obra e condições em [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md). Não são licenciados automaticamente sob AGPL nem CC0.
- MinIO local: compilado do código oficial sob AGPL v3, commit fixado no Dockerfile. O repositório de origem está arquivado; usado apenas no desenvolvimento local. Em produção, as imagens podem ficar no volume local da API ou em qualquer serviço compatível com S3. PostgreSQL, Go e Alpine possuem licenças próprias.

Screenshots do Jinsei incluem obras identificadas pelas respectivas fontes, apenas para demonstrar o uso da aplicação. Não constituem um pacote de capas para reutilização independente.
