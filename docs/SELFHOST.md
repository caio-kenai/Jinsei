# Hospedar seu próprio Jinsei

A versão inicial é **0.0.1**. Os pacotes oficiais são imagens Linux **amd64** para a API e o frontend, publicadas no [GitHub Packages](https://github.com/caio-kenai?tab=packages&repo_name=Jinsei). Use uma versão fixa ao atualizar. ARM64 ainda não foi validado.

Você controla o banco, o domínio e as políticas da sua instalação. A administração da instância permite mudar nome, descrição e contato público, abrir ou fechar cadastros, e permitir consultas externas. Bibliotecas e anotações continuam privadas por usuário.

## Requisitos

- Docker Engine/Desktop com Docker Compose v2, Git e servidor Linux amd64 ou Docker Desktop usando containers Linux.
- Como referência inicial, reserve 2 CPUs, 2 GB de RAM e espaço para o PostgreSQL e backups. Ajuste os recursos ao uso; isso não é um limite de capacidade medido.
- Para acesso pela internet: domínio, DNS apontando para o servidor e portas 80/443 disponíveis.

## Instalação local com imagens prontas

```sh
git clone --branch v0.0.1 https://github.com/caio-kenai/Jinsei.git
cd Jinsei
cp .env.selfhost.example .env.selfhost
```

No PowerShell, use `Copy-Item .env.selfhost.example .env.selfhost`. Edite esse arquivo antes de iniciar:

| Variável                      | Configuração                                                                                    |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| `JINSEI_VERSION`              | `0.0.1`, a versão das duas imagens                                                              |
| `POSTGRES_PASSWORD`           | Senha aleatória própria; use letras e números para evitar caracteres reservados na URL do banco |
| `PUBLIC_ORIGIN`               | `http://localhost:3000` para acesso somente local                                               |
| `JINSEI_BIND` / `JINSEI_PORT` | `127.0.0.1` / `3000` por padrão                                                                 |
| `INSTANCE_NAME`               | Nome inicial; após a primeira inicialização, altere pela administração                          |

```sh
docker compose --env-file .env.selfhost -f compose.selfhost.yml pull
docker compose --env-file .env.selfhost -f compose.selfhost.yml up -d --wait
```

Abra [localhost:3000](http://localhost:3000) e cadastre sua conta. Não há usuário ou senha padrão. O banco usa um volume persistente e não publica portas. As migrações são executadas antes de iniciar a API. O frontend encaminha `/api` à API pela rede interna.

## Promover o administrador

Depois de criar sua conta, execute no servidor, substituindo o endereço pelo e-mail já cadastrado:

```sh
docker compose --env-file .env.selfhost -f compose.selfhost.yml exec -T api node dist/scripts/promote-admin.js seu-email@example.com
```

O comando exige acesso ao Docker do servidor, promove apenas uma conta existente e não redefine a senha. Atualize a página e abra o menu da conta → **Administrar instância**. Nenhum endereço de e-mail recebe privilégios automaticamente. Operadores com acesso ao banco podem acessar seus dados; escolha uma instância de confiança.

## Domínio e HTTPS

Defina no arquivo local:

```dotenv
PUBLIC_ORIGIN=https://jinsei.seu-dominio.com
JINSEI_DOMAIN=jinsei.seu-dominio.com
JINSEI_BIND=127.0.0.1
```

Use somente a origem, sem caminho, query ou fragmento. `PUBLIC_ORIGIN` precisa corresponder ao endereço usado pelo navegador: a API verifica a origem em operações de escrita. Em produção, cookies são Secure com HTTPS; HTTP só é aceito em loopback.

O perfil opcional `tls` inicia Caddy e solicita um certificado para o domínio configurado:

```sh
docker compose --env-file .env.selfhost -f compose.selfhost.yml --profile tls up -d --wait
```

Configure DNS e firewall antes. Com um proxy próprio, encaminhe o domínio ao frontend na porta local 3000 e preserve o cabeçalho Host. A API e o PostgreSQL não precisam de portas públicas. Este guia não configura DNS, firewall ou backups automaticamente.

## Catálogos e apoio

As fontes públicas funcionam sem credenciais; consulte [Integrações](INTEGRATIONS.md). IGDB/Twitch e TMDB são opcionais. Segredos ficam somente em `.env.selfhost`; reinicie a API ao modificá-los. Desabilitar consultas externas impede novas buscas/importações externas, preservando os títulos já armazenados. Imagens externas existentes ainda podem ser requisitadas pelo navegador.

O **Buy Me a Monster** já vem configurado com o Pix oficial do criador do Jinsei e não depende de variáveis de ambiente. Pelos [termos adicionais da licença](../ADDITIONAL_TERMS.md), toda instalação deve mantê-lo visível e funcional, sem trocar o destinatário. A aplicação não processa pagamentos nem confirma recebimentos.

Não execute o seed de demonstração em produção. A pilha self-host não inclui MinIO: uploads ainda não estão disponíveis.

## Backup e restauração

Guarde `.env.selfhost` separadamente em local protegido. Para criar um dump sem redirecionamento binário do PowerShell, grave no container e copie o arquivo:

```sh
docker compose --env-file .env.selfhost -f compose.selfhost.yml exec -T postgres pg_dump -U jinsei -d jinsei -Fc -f /tmp/jinsei-backup.dump
docker compose --env-file .env.selfhost -f compose.selfhost.yml cp postgres:/tmp/jinsei-backup.dump ./jinsei-backup.dump
```

O dump contém dados pessoais. Proteja, copie para outro local e teste a restauração. Para restaurar **em uma instalação vazia separada**, com PostgreSQL em execução:

```sh
docker compose --env-file .env.selfhost -f compose.selfhost.yml cp ./jinsei-backup.dump postgres:/tmp/jinsei-backup.dump
docker compose --env-file .env.selfhost -f compose.selfhost.yml exec -T postgres pg_restore -U jinsei -d jinsei --no-owner --exit-on-error /tmp/jinsei-backup.dump
```

Não restaure sobre um banco com dados sem planejar a substituição. Não use `down --volumes` na sua instalação: isso apaga o banco persistente. A aplicação não agenda backups nem remove cópias antigas; defina retenção e considere pedidos de exclusão ao restaurar.

## Atualizações

1. Leia as notas da próxima release e faça backup do banco e da configuração.
2. Atualize o checkout para a tag correspondente e `JINSEI_VERSION` em `.env.selfhost`.
3. Execute os comandos `pull` e `up -d --wait` acima. As migrações são aplicadas automaticamente.
4. Confira login, biblioteca e `docker compose --env-file .env.selfhost -f compose.selfhost.yml ps`.

Reverter apenas a imagem não reverte uma migração. Em caso de incompatibilidade, use um backup testado e a versão correspondente em uma instalação separada.

## Compilar suas imagens

```sh
docker build -f docker/app/Dockerfile --target api -t local/jinsei-api:0.0.1 .
docker build -f docker/app/Dockerfile --target web -t local/jinsei-web:0.0.1 .
```

Defina `JINSEI_REGISTRY=local` na sua configuração e use `up -d --wait --pull never`. Ambas as imagens executam como usuário `node`, sem root. A construção instala dependências e gera o frontend; não requer credenciais dos catálogos.

## Limitações e diagnóstico

Esta primeira versão não inclui recuperação/verificação de e-mail, MFA, moderação, uploads ou restauração automática. Revise [SECURITY.md](../SECURITY.md) antes de operar um serviço público. Informe contato, retenção de logs e política de backup aos seus usuários.

```sh
docker compose --env-file .env.selfhost -f compose.selfhost.yml logs --tail 100 api web migrate
```

Erros de origem normalmente indicam `PUBLIC_ORIGIN` diferente do endereço do navegador. Falha no serviço `migrate` impede a API de iniciar; revise conexão e credenciais do banco. Não publique logs com e-mails, segredos ou dados pessoais em issues.

## Como as versões são publicadas

As versões seguem `0.0.1` até `0.0.9`, depois `0.1.0`, com incrementos equivalentes nas próximas séries. `pnpm version:next` mostra a próxima versão; `pnpm version:next --write` atualiza os arquivos de versão. Revise o diff, valide e registre antes de criar a tag e a release. `pnpm release:check` detecta divergências.

Uma release publicada dispara o workflow **Publica containers**, que valida a versão, executa verificações e testa a instalação antes de enviar as duas imagens ao GHCR. Tópicos do repositório e etiquetas de issues são a organização do projeto; tags `v…` identificam exclusivamente versões.
