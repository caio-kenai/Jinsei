# Segurança

Esta é uma versão inicial, 0.0.1, com instalação self-host. Não há promessa de suporte a versões antigas nem auditoria independente concluída.

## Relatar uma vulnerabilidade

Use a aba Security do repositório e a opção de relato privado, se estiver habilitada. Se esse recurso estiver indisponível, abra uma issue solicitando um canal privado, sem detalhes de exploração, dados pessoais, tokens ou credenciais. O projeto ainda não publica um endereço dedicado a relatos de segurança.

## Controles existentes

Senhas usam Argon2id; o banco armazena hashes dos identificadores de sessão. Cookies de sessão são HttpOnly, SameSite=Lax e Secure em produção com HTTPS; HTTP só é aceito em loopback. A API exige a origem configurada em operações de escrita, limita tentativas e deriva o proprietário da sessão. Dados de bibliotecas de outras contas não são acessíveis por identificador. Alteração de senha revoga todas as sessões; a exclusão de conta remove os registros pessoais no banco ativo. A administração da instância exige o papel de administrador conferido pelo servidor.

## Antes de disponibilizar publicamente

Defina HTTPS, segredos e credenciais próprios, backups e restauração, limites de infraestrutura, contato do operador, políticas de logs e retenção. Troque as credenciais locais de exemplo e não crie a conta de demonstração. Configure atualizações e revise as condições dos provedores habilitados. O Compose de desenvolvimento publica PostgreSQL e S3 somente no loopback. O [Compose de self-host](docs/SELFHOST.md) mantém o banco e a API sem portas públicas e oferece um proxy HTTPS opcional; o operador continua responsável por DNS, firewall, backups e políticas de serviço.

Recuperação e verificação de e-mail, MFA, gestão de sessões por dispositivo, moderação e política operacional de backups ainda não estão implementados. O serviço S3 está preparado, mas uploads não estão expostos. Imagens externas podem informar o IP do navegador aos seus provedores.

O adaptador PostgreSQL atual pode emitir um aviso de depreciação sobre consultas concorrentes em transações; os testes de integridade passam. React Compiler não está habilitado; o lint sinaliza a limitação conhecida da API TanStack Table para compilação automática.
