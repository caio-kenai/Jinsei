import { Injectable, Logger } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createTransport, type Transporter } from 'nodemailer';
import { env } from '../../config/env';

/** E-mail can be sent when an SMTP server is configured (or captured in development). */
export const mailEnabled = Boolean(env.SMTP_HOST || env.MAIL_CAPTURE_DIR);
/** Community features wait for a confirmed address only when real e-mail is available. */
export const verificationRequired = Boolean(env.SMTP_HOST) && env.EMAIL_VERIFICATION === 'required';

const escape = (value: string) => value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

export type MailContent = {
  subject: string;
  preview: string;
  title: string;
  paragraphs: string[];
  action?: { label: string; url: string };
  footnote?: string;
};

/** Builds the HTML and plain text versions of a branded message. */
export function renderMail(content: MailContent) {
  const button = content.action
    ? `<p style="margin:28px 0"><a href="${escape(content.action.url)}" style="display:inline-block;padding:12px 22px;border-radius:10px;background:#202020;color:#ffffff;font-weight:600;text-decoration:none">${escape(content.action.label)}</a></p>
       <p style="color:#8a8a93;font-size:12px;line-height:18px">Se o botão não funcionar, copie este endereço no navegador:<br><span style="color:#55555f;word-break:break-all">${escape(content.action.url)}</span></p>`
    : '';
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f5f5f7;font-family:Inter,Segoe UI,Arial,sans-serif;color:#29292f">
  <span style="display:none">${escape(content.preview)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #ececf0">
  <tr><td style="height:6px;border-radius:16px 16px 0 0;background:linear-gradient(90deg,#e5306f,#f7832b,#7050cf)"></td></tr>
  <tr><td style="padding:32px 34px">
    <p style="margin:0 0 18px;font-size:20px;font-weight:800;letter-spacing:-0.4px">人生 Jinsei</p>
    <h1 style="margin:0 0 14px;font-size:22px;line-height:30px">${escape(content.title)}</h1>
    ${content.paragraphs.map((text) => `<p style="margin:0 0 12px;font-size:14px;line-height:22px;color:#4a4a52">${escape(text)}</p>`).join('')}
    ${button}
    ${content.footnote ? `<p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #eee;color:#8a8a93;font-size:12px;line-height:18px">${escape(content.footnote)}</p>` : ''}
  </td></tr></table>
  <p style="color:#9a9aa3;font-size:11px;margin-top:16px">${escape(env.INSTANCE_NAME)} · ${escape(env.WEB_ORIGIN)}</p>
  </td></tr></table></body></html>`;
  const text = [
    content.title,
    '',
    ...content.paragraphs,
    ...(content.action ? ['', `${content.action.label}: ${content.action.url}`] : []),
    ...(content.footnote ? ['', content.footnote] : []),
  ].join('\n');
  return { html, text };
}

@Injectable()
export class MailService {
  private readonly logger = new Logger('Mail');
  private transport: Transporter | null = env.SMTP_HOST
    ? createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE === 'true',
        requireTLS: env.SMTP_SECURE !== 'true',
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
      })
    : null;

  /** Sends a message; failures are logged without exposing the address or content. */
  async send(to: string, content: MailContent) {
    const { html, text } = renderMail(content);
    try {
      if (this.transport) {
        await this.transport.sendMail({
          from: env.SMTP_FROM || `${env.INSTANCE_NAME} <${env.SMTP_USER}>`,
          to,
          subject: content.subject,
          html,
          text,
        });
        return true;
      }
      if (env.MAIL_CAPTURE_DIR) {
        await mkdir(env.MAIL_CAPTURE_DIR, { recursive: true });
        const name = `${Date.now()}-${randomBytes(4).toString('hex')}.json`;
        await writeFile(
          join(env.MAIL_CAPTURE_DIR, name),
          JSON.stringify({ to, subject: content.subject, text, action: content.action?.url }),
        );
        return true;
      }
    } catch (error) {
      this.logger.warn(`Falha ao enviar e-mail: ${(error as Error).message}`);
    }
    return false;
  }
}
