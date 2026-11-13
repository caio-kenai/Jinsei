import Link from 'next/link';
import { LegalLayout } from '@/features/legal/legal-layout';
export default function Page() {
  return (
    <LegalLayout title="Política de privacidade" active="privacy">
      <p>
        Atualizado em 13 de novembro de 2026. Este aviso descreve a versão inicial do projeto. Cada
        responsável por uma instalação deve informar seu contato e suas condições operacionais antes
        de oferecer acesso público.
      </p>
      <h2>O que fica guardado</h2>
      <p>
        Guardamos seu e-mail e uma representação protegida da senha para autenticação; nome,
        username e preferências para personalizar o aplicativo; e os títulos, notas, progresso, tags
        e anotações que você registra. Os dados ficam no PostgreSQL da instalação. Esta versão não
        oferece perfis públicos.
      </p>
      <h2>Sessões e preferências</h2>
      <p>
        Um cookie HttpOnly mantém sua sessão por até sete dias na configuração padrão. No banco fica
        somente o hash do identificador aleatório da sessão. Sair ou alterar a senha revoga as
        sessões correspondentes. O navegador também guarda sua escolha de tema. Não usamos
        publicidade, analytics de terceiros ou rastreadores de marketing.
      </p>
      <h2>Busca e fontes externas</h2>
      <p>
        Buscas podem enviar o título pesquisado ao Wikidata, TVmaze ou Open Library. Imagens de
        jogos também podem ser obtidas da CheapShark por identificador público da obra. IGDB e TMDB
        só são consultadas quando configuradas. Seu e-mail, sua senha, sua nota e suas anotações não
        são enviados a esses provedores. Metadados autorizados podem integrar um catálogo
        compartilhado. Cadastros manuais e dados da biblioteca permanecem privados. Capas externas,
        quando autorizadas, são requisitadas pelo navegador ao provedor da imagem.
      </p>
      <h2>Consultar, corrigir, exportar e excluir</h2>
      <p>
        Em <Link href="/settings">Configurações</Link>, você pode corrigir seu perfil, exportar seus
        dados em JSON, alterar sua senha e excluir sua conta mediante confirmação da senha. A
        exclusão remove seus registros pessoais do banco ativo. Metadados públicos de provedores
        continuam no catálogo sem associá-los à conta excluída.
      </p>
      <h2>Retenção e responsáveis pela instalação</h2>
      <p>
        Os registros pessoais permanecem enquanto a conta existir ou até você removê-los. Sessões
        expiram automaticamente e são limpas em novos acessos. A instalação padrão não cria backups
        automáticos nem define retenção de logs de infraestrutura. O operador deve estabelecer e
        informar essas políticas, o canal de atendimento aos titulares e as bases aplicáveis ao
        tratamento antes de uma implantação pública.
      </p>
      <h2 id="contato">Legislação e dúvidas</h2>
      <p>
        O projeto considera princípios de privacidade e os mecanismos descritos na{' '}
        <a
          href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm"
          target="_blank"
          rel="noreferrer"
        >
          Lei Geral de Proteção de Dados
        </a>
        . A existência destes controles não certifica conformidade jurídica ou operacional. Dúvidas
        sobre uma instalação devem ser dirigidas ao seu operador; não envie dados pessoais por
        issues públicas.
      </p>
      <p style={{ marginTop: 25 }}>
        <Link href="/home">Voltar ao Jinsei</Link>
      </p>
    </LegalLayout>
  );
}
