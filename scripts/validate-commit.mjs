import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const titlePattern = /^(Feat|Fix|Refactor|Chore|Docs|Style|Test|Perf|Build|Ci|Security): \p{Lu}.+/u;
function valid(message) {
  const [title, ...body] = message.trim().split(/\r?\n/);
  return (
    title.length <= 100 &&
    titlePattern.test(title) &&
    !/[.!?]$/.test(title) &&
    !/\p{Extended_Pictographic}/u.test(title) &&
    !/Co-authored-by:/i.test(message) &&
    (body.length === 0 ||
      (body[0] === '' && body.slice(1).every((line) => !line || /^- \p{Lu}/u.test(line))))
  );
}
const [argument, range] = process.argv.slice(2);
if (argument === '--self-test') {
  for (const [message, expected] of [
    ['Feat: Adiciona filtro', true],
    ['Fix: Corrige a nota\n\n- Preserva o progresso', true],
    ['feat: adiciona filtro', false],
    ['Docs: Atualiza.', false],
    ['Chore: Ajusta\nCorpo solto', false],
  ]) {
    if (valid(message) !== expected) throw new Error('Falha na validação do padrão de commits');
  }
} else {
  const messages =
    argument === '--range'
      ? execFileSync('git', ['log', '--no-merges', '--format=%B%x00', range], { encoding: 'utf8' })
          .split('\0')
          .map((value) => value.trim())
          .filter(Boolean)
      : [readFileSync(argument, 'utf8')];
  if (messages.some((message) => !valid(message))) {
    console.error(
      'Use um título como "Feat: Adiciona funcionalidade", sem ponto final. Corpo opcional: linha em branco e itens "- Descreve a alteração".',
    );
    process.exitCode = 1;
  }
}
