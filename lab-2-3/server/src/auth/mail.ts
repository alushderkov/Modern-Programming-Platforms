import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../logger';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export const mailOutbox: MailMessage[] = [];

export function clearMailOutbox(): void {
  mailOutbox.length = 0;
}

async function deliver(message: MailMessage): Promise<void> {
  if (config.nodeEnv !== 'production') {
    mailOutbox.push(message);
    if (mailOutbox.length > 50) {
      mailOutbox.shift();
    }
  }

  if (!config.smtp.host) {
    logger.info({ event: 'mail.dev_dump', to: message.to, subject: message.subject, text: message.text });
    return;
  }

  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });

  await transporter.sendMail({
    from: config.mailFrom,
    to: message.to,
    subject: message.subject,
    text: message.text,
  });
  logger.info({ event: 'mail.sent', to: message.to, subject: message.subject });
}

export async function sendPasswordResetMail(email: string, token: string): Promise<void> {
  const link = `${config.appUrl.replace(/\/$/, '')}/reset?token=${encodeURIComponent(token)}`;
  const text = [
    'Запрошено восстановление доступа к каталогу «Кадр».',
    '',
    'Перейдите по ссылке (действует 1 час):',
    link,
    '',
    'Если вы не запрашивали сброс, просто проигнорируйте письмо.',
  ].join('\n');

  logger.info({
    event: 'auth.recovery.mail',
    email,
    link: config.nodeEnv === 'production' ? undefined : link,
  });

  await deliver({
    to: email,
    subject: 'Восстановление доступа · Кадр',
    text,
  });
}
