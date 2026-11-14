# Histórico de versões

## 0.0.4 — 2026-11-14

- Apresentação reformulada: título revelado palavra por palavra, categorias alternando no subtítulo, auroras em movimento, prévia que se inclina durante a rolagem e cartões com luz que segue o ponteiro.
- Botão Comece agora com borda arco-íris giratória, aura e brilho; destaques semelhantes no onboarding e na vitrine final.
- Troca de tema com revelação circular a partir do botão usado e ícones de sol e lua animados.
- Onboarding em cascata, com escolhas que reagem ao ponteiro, e hover em todos os botões da aplicação.
- Status com cores vivas e texto branco e ícone maior na aba do navegador.

## 0.0.3 — 2026-11-14

- Animações fluidas na área de trabalho: destaque deslizante na navegação, nas abas e na paleta de comandos, entrada suave das telas e cascata em listas, cartões e seções.
- Barras de progresso, anéis de metas e números que crescem ao aparecer, com saída animada para diálogos e menus.
- Estados vazios, telas de acesso e insígnias com movimento discreto; tudo respeita a preferência de reduzir movimento.
- Pílulas de status uniformes na lista e saudação conforme o horário.

## 0.0.2 — 2026-11-14

- Buy Me a Monster obrigatório em qualquer instalação, com o Pix do criador e termos adicionais da licença.
- Categoria Livros, com busca no Open Library e acompanhamento por páginas.
- Progresso por episódios (com temporada atual), capítulos, volumes, páginas e sessões de filmes.
- Metadados específicos de cada categoria importados dos catálogos e informados no cadastro manual.
- Status ajustado automaticamente ao iniciar ou concluir uma obra pelo progresso.
- Visualizações em Quadro (arrastar e soltar entre status) e Calendário, com várias visualizações salvas por espaço.
- Datas de início e conclusão registradas automaticamente e editáveis.
- Coleções e rankings com reordenação, títulos de várias categorias e visibilidade configurável.
- Metas com progresso automático por período, categoria ou coleção, exibidas também no início.
- Exportação de dados com coleções, metas e histórico de progresso.
- Jornada com níveis, missões, sequência de dias no fuso do usuário, insígnias e títulos, sem prêmios repetidos ao recadastrar títulos.
- Página de estatísticas e paleta de comandos com Ctrl+K.
- Perfis públicos com seções configuráveis, resenhas públicas, coleções compartilháveis, SEO e sitemap.
- Envio de avatar, banner e capas de coleção para armazenamento compatível com S3.
- Arrastar e soltar acessível por teclado no quadro e nas coleções, e gráficos com dicas ao passar o mouse.

## 0.0.1 — 2026-11-13

Primeira versão do Jinsei, para desenvolvimento e instalação em servidor próprio.

- Autenticação por e-mail e senha, onboarding e biblioteca privada em Lista e Galeria.
- Jogos, animes, mangás, filmes e séries com metadados e capas de fontes externas quando disponíveis, com créditos de origem.
- Avaliações de até cinco estrelas em passos de ¼, favoritos, tags, anotações e progresso de jogos.
- Filtros, colunas, agrupamento, ordenação e visualizações salvas.
- Temas claro/escuro/sistema, cores de destaque, perfil privado e favoritos no menu da conta.
- Apresentação animada, nova identidade visual, telas de acesso, apoio voluntário e páginas de privacidade e termos.
- Exportação de dados, alteração de senha e exclusão de conta.
- Imagens Docker para API e frontend, PostgreSQL persistente, HTTPS opcional e administração da instância.

Limitações: sem recuperação/verificação de e-mail, MFA, uploads, perfis públicos, quadro, calendário, coleções ou metas. O acompanhamento por episódio/capítulo ainda não está implementado. Consulte [segurança](SECURITY.md) e [self-host](docs/SELFHOST.md) antes de disponibilizar um servidor público.

As próximas versões seguem a sequência `0.0.2` até `0.0.9`, depois `0.1.0`.
