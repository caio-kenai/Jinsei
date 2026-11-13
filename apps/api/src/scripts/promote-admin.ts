import { emailSchema } from '@jinsei/contracts';
import { PrismaService } from '../prisma/prisma.service';

async function main() {
  const email = emailSchema.parse(process.argv[2]);
  const db = new PrismaService();
  try {
    const user = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) throw new Error('Cadastre a conta no Jinsei antes de promovê-la a administrador');
    await db.user.update({ where: { id: user.id }, data: { role: 'admin' } });
    console.info(
      'A conta indicada agora administra esta instância. Suas credenciais permanecem as mesmas.',
    );
  } finally {
    await db.$disconnect();
  }
}
void main().catch((error: unknown) => {
  console.error(
    error instanceof Error && !('code' in error)
      ? error.message
      : 'Não foi possível promover a conta. Confira o banco e o e-mail.',
  );
  process.exitCode = 1;
});
