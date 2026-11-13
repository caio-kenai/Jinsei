import { execFileSync } from 'node:child_process';
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);
const forbidden =
  /(^|\/)(?:\.env(?:\..*)?|CODEX\.md|CLAUDE\.md|AGENTS\.md|\.internal|\.local-docs|\.private-notes)(?:\/|$)|\.(?:pem|key|p12|pfx)$/i;
const allowed = /(^|\/)\.env(?:\..+)?\.example$|(^|\/)\.env\.example$/;
const tokenFile = /(^|\/)(?:[^/]*personal[ _-]*access[ _-]*token[^/]*|pat(?:\..*)?|[^/]+\.pat)$/i;
const invalid = files.filter(
  (file) => (forbidden.test(file) && !allowed.test(file)) || tokenFile.test(file),
);
if (invalid.length) {
  console.error('Arquivos privados ou sensíveis rastreados:', invalid.join(', '));
  process.exitCode = 1;
}
