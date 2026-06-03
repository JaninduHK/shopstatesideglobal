import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sgMail from '@sendgrid/mail';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = path.join(__dirname, '..', 'templates', 'email');

if (env.email.sendgridKey) {
  sgMail.setApiKey(env.email.sendgridKey);
}

// Active provider: Brevo takes precedence, then SendGrid, otherwise mock.
const provider = env.email.brevoApiKey ? 'brevo' : env.email.sendgridKey ? 'sendgrid' : null;

const templateCache = new Map();

async function loadTemplate(name) {
  if (templateCache.has(name) && env.isProd) return templateCache.get(name);
  const filepath = path.join(TEMPLATE_DIR, `${name}.html`);
  const html = await fs.readFile(filepath, 'utf-8');
  templateCache.set(name, html);
  return html;
}

function render(template, vars) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) =>
    vars[key] === undefined || vars[key] === null ? '' : String(vars[key]),
  );
}

function stripHtml(html) {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gs, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Send through Brevo's transactional email HTTP API (Node 20 has global fetch).
async function sendViaBrevo({ to, subject, html, text }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': env.email.brevoApiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: env.email.from, name: env.email.fromName },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo send failed (${res.status}): ${body}`);
  }
  return { sent: true };
}

async function sendViaSendgrid({ to, subject, html, text }) {
  await sgMail.send({
    to,
    from: { email: env.email.from, name: env.email.fromName },
    subject,
    html,
    text,
  });
  return { sent: true };
}

/**
 * Sends a transactional email via the configured provider (Brevo or SendGrid).
 * With no provider key set it logs the email instead of sending (dev/mock).
 */
export async function sendEmail({ to, subject, template, vars = {} }) {
  const html = render(await loadTemplate(template), {
    ...vars,
    fromName: env.email.fromName,
    clientUrl: env.clientUrl,
  });
  const text = stripHtml(html);

  if (!provider) {
    logger.info(`[email:dev] to=${to} subject="${subject}" template=${template}`);
    if (!env.isProd && !env.isTest) {
      logger.debug(`[email:dev:body]\n${text}`);
    }
    return { mocked: true };
  }

  if (provider === 'brevo') return sendViaBrevo({ to, subject, html, text });
  return sendViaSendgrid({ to, subject, html, text });
}
