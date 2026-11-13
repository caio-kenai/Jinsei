import Link from 'next/link';
import { Brand } from '@/components/shared/brand';
export default function Page() {
  return (
    <main className="legal-page">
      <Link href="/home">
        <Brand />
      </Link>
      <h1>Termos e licenças</h1>
      <p>
        Atualizado em 13 de novembro de 2026. O Jinsei é um projeto gratuito e open source para
        organizar experiências culturais. Esta versão está em desenvolvimento e é destinada à
        avaliação local.
      </p>
      <h2>Uso e responsabilidade</h2>
      <p>
        Mantenha suas credenciais protegidas e cadastre somente informações e conteúdos que você
        tenha direito de utilizar. Não use o sistema para acessar dados de outras pessoas ou violar
        direitos de terceiros. A instalação deve ser avaliada e configurada pelo seu responsável
        antes de oferecer um serviço público.
      </p>
      <h2>Código e contribuições</h2>
      <p>
        O código é distribuído sob a licença GNU AGPL v3 presente no{' '}
        <a
          href="https://github.com/caio-kenai/Jinsei/blob/main/LICENSE"
          target="_blank"
          rel="noreferrer"
        >
          repositório do projeto
        </a>
        . O texto integral da licença rege as permissões e condições aplicáveis. As imagens, marcas
        e dados de terceiros têm direitos próprios.
      </p>
      <h2>Metadados e imagens</h2>
      <p>
        Metadados estruturados do Wikidata são disponibilizados sob CC0. As imagens ligadas a esses
        registros não são automaticamente incorporadas por possuírem licenças próprias. A IGDB
        requer habilitação pelo operador após verificar suas condições de uso. As atribuições de
        origem acompanham os títulos importados.
      </p>
      <h2>Apoio voluntário</h2>
      <p>
        Doações são opcionais e não desbloqueiam funcionalidades. O Jinsei não processa pagamentos,
        solicita credenciais bancárias ou confirma recebimentos. Uma eventual operação Pix é
        realizada exclusivamente no aplicativo bancário escolhido pelo doador.
      </p>
      <h2>Disponibilidade e seus dados</h2>
      <p>
        Esta versão não oferece garantia de disponibilidade ou recuperação automática de dados. Você
        pode exportar sua biblioteca nas configurações. Consulte o{' '}
        <Link href="/privacy">aviso de privacidade</Link> para saber como os dados são usados e
        removidos.
      </p>
      <p style={{ marginTop: 25 }}>
        <Link href="/home">Voltar ao Jinsei</Link>
      </p>
    </main>
  );
}
