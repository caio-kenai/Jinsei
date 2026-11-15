import { getT } from '@/i18n/server';
import Link from 'next/link';
import { LegalLayout } from '@/features/legal/legal-layout';
export default async function Page() {
  const t = await getT();
  return (
    <LegalLayout title={t('Termos de uso')} active="terms">
      <p>
        {t(
          'Atualizado em 14 de novembro de 2026. O Jinsei é um projeto gratuito e open source para organizar experiências culturais. Esta é uma versão inicial, disponível para instalação e administração em servidor próprio.',
        )}
      </p>
      <h2>{t('Uso e responsabilidade')}</h2>
      <p>
        {t(
          'Mantenha suas credenciais protegidas e cadastre somente informações e conteúdos que você tenha direito de utilizar. Não use o sistema para acessar dados de outras pessoas ou violar direitos de terceiros. A instalação deve ser avaliada e configurada pelo seu responsável antes de oferecer um serviço público.',
        )}
      </p>
      <h2>{t('Código e contribuições')}</h2>
      <p>
        {t('O código é distribuído sob a licença GNU AGPL v3 presente no')}{' '}
        <a
          href="https://github.com/caio-kenai/Jinsei/blob/main/LICENSE"
          target="_blank"
          rel="noreferrer"
        >
          {t('repositório do projeto')}
        </a>
        {t(', com')}{' '}
        <a
          href="https://github.com/caio-kenai/Jinsei/blob/main/ADDITIONAL_TERMS.md"
          target="_blank"
          rel="noreferrer"
        >
          {t('termos adicionais de atribuição')}
        </a>{' '}
        {t(
          'que exigem preservar a autoria de Caio Oliveira Pacifico e o Buy Me a Monster em todas as cópias e instalações. O texto integral da licença rege as permissões e condições aplicáveis. As imagens, marcas e dados de terceiros têm direitos próprios.',
        )}
      </p>
      <h2>{t('Metadados e imagens')}</h2>
      <p>
        {t(
          'Metadados estruturados do Wikidata são disponibilizados sob CC0. As imagens ligadas a esses registros não são automaticamente incorporadas por possuírem licenças próprias. A IGDB requer habilitação pelo operador após verificar suas condições de uso. As atribuições de origem acompanham os títulos importados.',
        )}
      </p>
      <h2>{t('Apoio voluntário')}</h2>
      <p>
        {t(
          'O Buy Me a Monster direciona doações ao criador do Jinsei, em qualquer servidor. Doações são opcionais e não desbloqueiam funcionalidades. O Jinsei não processa pagamentos, solicita credenciais bancárias ou confirma recebimentos. Uma eventual operação Pix é realizada exclusivamente no aplicativo bancário escolhido pelo doador.',
        )}
      </p>
      <h2>{t('Disponibilidade e seus dados')}</h2>
      <p>
        {t(
          'Esta versão não oferece garantia de disponibilidade ou recuperação automática de dados. Você pode exportar sua biblioteca nas configurações. Consulte o',
        )}{' '}
        <Link href="/privacy">{t('aviso de privacidade')}</Link>{' '}
        {t('para saber como os dados são usados e removidos.')}
      </p>
      <p style={{ marginTop: 25 }}>
        <Link href="/home">{t('Voltar ao Jinsei')}</Link>
      </p>
    </LegalLayout>
  );
}
