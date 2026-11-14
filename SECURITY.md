# Segurança

O Jinsei está na série 0.1, com instalação self-host. Recebem correções apenas a versão mais recente publicada nas Releases. Não há auditoria independente concluída.

## Relatar uma vulnerabilidade

Use a aba Security do repositório e a opção de relato privado, se estiver habilitada. Se esse recurso estiver indisponível, abra uma issue solicitando um canal privado, sem detalhes de exploração, dados pessoais, tokens ou credenciais. O projeto ainda não publica um endereço dedicado a relatos de segurança. Inclua a versão afetada, os passos para reproduzir e o impacto esperado.

## Controles existentes

- **Contas e sessões:** senhas usam Argon2id e o banco guarda apenas hashes dos identificadores de sessão. Cookies de sessão são HttpOnly, SameSite=Lax e Secure em produção com HTTPS; HTTP só é aceito em loopback. Cada sessão registra navegador, sistema e último acesso (sem endereço IP) e pode ser encerrada pela própria conta. Alteração de senha revoga todas as sessões.
- **Autorização:** a API exige a origem configurada em operações de escrita, limita tentativas por minuto e deriva o proprietário de cada registro da sessão. Bibliotecas, anotações, tags e visualizações de outras contas não são acessíveis por identificador. A administração da instância exige o papel de administrador conferido pelo servidor.
- **Perfil público e obras:** só é publicado o que a pessoa ativa: perfil público, seções escolhidas e reviews marcadas como públicas. Títulos cadastrados manualmente nunca aparecem em páginas públicas ou rankings.
- **Comunidade:** buscas mostram somente nome, usuário e avatar; perfis privados só são encontrados pelo usuário exato e o e-mail nunca é exposto. Mensagens privadas exigem amizade aceita, e terceiros recebem 404 ao tentar abrir uma conversa. Publicações em clubes exigem participação, e quem criou o clube pode removê-las. Pedidos, mensagens, publicações e criação de clubes têm limites próprios.
- **Imagens enviadas:** o formato real do arquivo é verificado (JPEG, PNG ou WebP), o tamanho é limitado e as imagens são entregues pela API com `nosniff` e uma CSP restritiva. No armazenamento local, os nomes são gerados pelo servidor e caminhos fora da pasta de mídia são recusados.
- **Dados pessoais:** a exportação inclui biblioteca, preferências, coleções, metas e dados da comunidade. A exclusão de conta remove os registros pessoais no banco ativo, as imagens enviadas, as mensagens e os clubes criados pela pessoa.

## Antes de disponibilizar publicamente

Defina HTTPS, segredos e credenciais próprios, backups e restauração (banco e volume `media` ou bucket S3), limites de infraestrutura, contato do operador, políticas de logs e retenção. Troque as credenciais locais de exemplo e não crie a conta de demonstração. Configure atualizações e revise as condições dos provedores habilitados. O Compose de desenvolvimento publica PostgreSQL e S3 somente no loopback. O [Compose de self-host](docs/SELFHOST.md) mantém o banco e a API sem portas públicas e oferece um proxy HTTPS opcional; o operador continua responsável por DNS, firewall, backups e políticas de serviço.

## Limitações conhecidas

Recuperação e verificação de e-mail, MFA, bloqueio e denúncia de usuários e moderação pela administração da instância ainda não estão implementados. Mensagens não têm criptografia de ponta a ponta: ficam no banco da instância. Imagens externas de catálogos podem informar o IP do navegador aos seus provedores.

O adaptador PostgreSQL atual pode emitir um aviso de depreciação sobre consultas concorrentes em transações; os testes de integridade passam. React Compiler não está habilitado; o lint sinaliza a limitação conhecida da API TanStack Table para compilação automática.
