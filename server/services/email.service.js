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

/**
 * Sends a transactional email.
 * In dev (no SENDGRID_API_KEY) it logs the email to console instead.
 */
export async function sendEmail({ to, subject, template, vars = {} }) {
  const html = render(await loadTemplate(template), {
    ...vars,
    fromName: env.email.fromName,
    clientUrl: env.clientUrl,
  });
  const text = stripHtml(html);

  if (!env.email.sendgridKey) {
    logger.info(`[email:dev] to=${to} subject="${subject}" template=${template}`);
    if (!env.isProd && !env.isTest) {
      logger.debug(`[email:dev:body]\n${text}`);
    }
    return { mocked: true };
  }

  await sgMail.send({
    to,
    from: { email: env.email.from, name: env.email.fromName },
    subject,
    html,
    text,
  });
  return { sent: true };
}
