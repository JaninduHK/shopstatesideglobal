import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = path.join(__dirname, '..', 'templates', 'email');

// Mailjet is configured only when BOTH halves of its credential are present.
// With neither set, emails are mocked (logged) instead of sent — handy for dev.
const mailjetConfigured = Boolean(env.email.mailjetApiKey && env.email.mailjetSecretKey);

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

// Mailjet transactional Send API v3.1 — Basic auth (apiKey:secretKey), Node 20 global fetch.
async function sendViaMailjet({ to, subject, html, text }) {
  const auth = Buffer.from(`${env.email.mailjetApiKey}:${env.email.mailjetSecretKey}`).toString('base64');
  const res = await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      Messages: [
        {
          From: { Email: env.email.from, Name: env.email.fromName },
          To: [{ Email: to }],
          Subject: subject,
          TextPart: text,
          HTMLPart: html,
        },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Mailjet send failed (${res.status}): ${body}`);
  }
  return { sent: true };
}

// Single delivery path used by both the template-based and raw-HTML senders.
async function deliver({ to, subject, html, text }) {
  if (!mailjetConfigured) {
    logger.info(`[email:dev] to=${to} subject="${subject}"`);
    if (!env.isProd && !env.isTest) {
      logger.debug(`[email:dev:body]\n${text}`);
    }
    return { mocked: true };
  }
  return sendViaMailjet({ to, subject, html, text });
}

/**
 * Sends a transactional email rendered from an HTML template file.
 * With Mailjet not configured it logs the email instead of sending (dev/mock).
 */
export async function sendEmail({ to, subject, template, vars = {} }) {
  const html = render(await loadTemplate(template), {
    ...vars,
    fromName: env.email.fromName,
    clientUrl: env.clientUrl,
  });
  const text = stripHtml(html);
  return deliver({ to, subject, html, text });
}

/**
 * Sends an email from pre-rendered HTML (no template file) — e.g. admin one-off messages.
 */
export async function sendRawEmail({ to, subject, html, text }) {
  return deliver({ to, subject, html, text: text ?? stripHtml(html) });
}
