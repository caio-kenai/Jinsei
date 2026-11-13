# Integrações e imagens

Os dados do catálogo global são separados dos registros pessoais. Provedores são consultados no servidor; e-mail, senha, avaliações e anotações não são enviados a eles. Imagens externas são exibidas diretamente de suas fontes, sem encaminhar o referer da página. O provedor da imagem pode receber o endereço IP do navegador.

| Fonte                                                                         | Uso implementado                                                                                 | Configuração e condições                                                                                                                                                         |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Wikidata](https://www.wikidata.org/wiki/Wikidata:Licensing)                  | Busca e identificação de obras; plataformas, gêneros, desenvolvedores e datas quando disponíveis | Metadados CC0; classificação pela informação disponível no catálogo                                                                                                              |
| [Wikimedia Commons](https://www.mediawiki.org/wiki/Extension:CommonsMetadata) | Capas e pôsteres vinculados à obra                                                               | Licença verificada por arquivo: domínio público, CC0, CC BY ou CC BY-SA. Artista, licença e página de origem preservados. Fotos, screenshots e logos não são tratados como capas |
| [CheapShark](https://apidocs.cheapshark.com/)                                 | Alternativa de imagem para jogos identificados pelo Steam ID do Wikidata                         | API pública sem chave. Exibe exatamente a thumbnail retornada, preservando formato horizontal. Autorização de exibição pela API, sem alegação de licença livre da arte           |
| [TVmaze](https://www.tvmaze.com/api)                                          | Séries e animes, com pôsteres                                                                    | Sem chave; metadados CC BY-SA. Imagens via serviço com direitos dos respectivos titulares. Anime identificado como animação em japonês; classificação pode ser incompleta        |
| [Open Library](https://openlibrary.org/dev/docs/api/covers)                   | Mangás, com capas de obras/edições                                                               | Sem chave; Covers API por identificador. A imagem corresponde à edição selecionada; traduções e volumes podem aparecer separadamente. Direitos das capas são próprios            |
| [IGDB](https://api-docs.igdb.com/)                                            | Adaptador opcional de jogos e capas                                                              | `IGDB_ENABLED=true`, `IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET`. OAuth do Twitch no servidor. Uso condicionado aos termos do provedor                                                |
| [TMDB](https://developer.themoviedb.org/docs/getting-started)                 | Adaptador opcional de filmes e séries, com pôsteres                                              | `TMDB_READ_TOKEN`. Configuração de imagens consultada na API; uso condicionado aos termos do provedor                                                                            |

TMDB: “This product uses the TMDB API but is not endorsed or certified by TMDB.” O operador que habilitar essa integração deve incluir também a identidade de atribuição exigida pelo provedor antes de disponibilizá-la publicamente.

A integração CheapShark faz consultas sob demanda por um identificador conhecido, usa User-Agent próprio, cache limitado e respeita `Retry-After` em respostas 429. Não coleta um catálogo em massa. Caso sejam adicionados links para ofertas, devem passar pelo redirect CheapShark; não usar links afiliados próprios para lojas cobertas pela API. Outras fontes e formas de monetização possuem condições próprias.

## Metadados de capa

`MediaItem.coverUrl` e `coverAttribution` são compartilhados por todas as categorias. A atribuição registra provedor, página de origem, condições de uso/licença, link da licença, artista quando informado e orientação da imagem. A licença CC0 dos dados Wikidata não se estende automaticamente à imagem.

Busca, lista, galeria e detalhes reutilizam esses metadados. Os detalhes apresentam créditos; imagens ausentes ou que falham ao carregar recebem indicação de indisponibilidade. Nunca são substituídas por logotipos ou arte inventada. Um cadastro pessoal aceita uma URL HTTPS de imagem que o usuário tenha permissão para utilizar; ela permanece no registro privado.

O cache de buscas é limitado a 100 consultas por provedor por dez minutos. Metadados já importados com capa podem ser reutilizados por um dia; a importação tenta completar registros antigos sem imagem. Deduplicação usa provedor + identificador externo. Edições e duplicatas entre provedores diferentes ainda podem exigir revisão.

## Disponibilidade

Capas são buscadas quando há uma fonte disponível; cobertura universal não é garantida. Filmes contemporâneos e alguns jogos têm cobertura maior com TMDB/IGDB configuradas. Sem chaves, a aplicação continua operando com as fontes públicas e o cadastro pessoal. Indisponibilidade de um provedor não apaga registros existentes.

Os testes de integração incluem consultas reais para jogos, filmes, séries, animes e mangás; dependem da disponibilidade dos serviços externos. Não há scraping de páginas nem uso de endpoints privados de aplicativos.
