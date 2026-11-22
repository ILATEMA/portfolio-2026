'use strict';

/**
 * POST /api/contact
 * Reçoit { name, email, lang, company (piège anti-spam), elapsed } et :
 *   1) envoie un e-mail chaleureux au visiteur pour engager la conversation,
 *   2) t'envoie une copie (nom + e-mail du visiteur) pour que tu puisses le relancer.
 *
 * SMTP : Gmail (smtp.gmail.com) avec un "mot de passe d'application".
 * Variables d'environnement : GMAIL_USER, GMAIL_APP_PASSWORD, OWNER_EMAIL (optionnelle).
 */

const nodemailer = require('nodemailer');

const OWNER_NAME = 'Moubarack ILATEMA';
const WHATSAPP_URL = 'https://wa.me/2290169892699';
const WHATSAPP_LABEL = '+229 01 69 89 26 99';

// Couleurs des e-mails (à garder identiques à la palette du site : public/css/style.css, bloc :root)
const T = {
  forest900: '#0e2a1f',
  forest800: '#143828',
  sand: '#e8dcc0',
  violet: '#7b2ff7',
  violetSoft: '#b490ff',
  paper: '#f4ecd8',
  sandDim: '#b9ae92',
  skyDim: '#b9ae92',
  ink: '#143828',
  inkMute: '#4f6657',
};

/* ---------- Limitation de débit (au mieux, en mémoire) ---------- */
const ipHits = new Map();
const emailHits = new Map();

function limited(map, key, max, windowMs) {
  const now = Date.now();
  const list = (map.get(key) || []).filter((t) => now - t < windowMs);
  if (list.length >= max) {
    map.set(key, list);
    return true;
  }
  list.push(now);
  map.set(key, list);
  if (map.size > 5000) map.clear();
  return false;
}

/* ---------- Utilitaires ---------- */
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function cleanName(v) {
  return String(v == null ? '' : v)
    .replace(/[\u0000-\u001f\u007f<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function validEmail(v) {
  return (
    typeof v === 'string' &&
    v.length <= 254 &&
    !/[\s,;<>()\[\]\\"]/.test(v) &&
    /^[^@]+@[^@]+\.[^@.]{2,}$/.test(v)
  );
}

function clientIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || (req.socket && req.socket.remoteAddress) || 'unknown';
}

let transporter = null;
function getTransporter(user, pass) {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
    });
  }
  return transporter;
}

/* ---------- Contenu des e-mails ---------- */
const COPY = {
  fr: {
    subject: (n) => `Merci pour votre visite, ${n} — parlons de votre projet`,
    preheader: 'Je serais ravi d’en savoir plus sur ce que vous avez en tête.',
    hello: (n) => `Bonjour ${n},`,
    p1: 'Merci d’avoir pris le temps de visiter mon portfolio : c’est un vrai plaisir de vous compter parmi mes visiteurs.',
    p2: 'Je serais ravi d’en savoir plus sur ce que vous avez en tête. Que ce soit une idée encore floue ou un projet déjà bien avancé, discutons-en simplement, sans engagement.',
    ask: 'Pour démarrer, répondez à cet e-mail en me disant :',
    bullets: [
      'ce que vous souhaitez réaliser ;',
      'pour qui, et dans quel contexte ;',
      'vos délais, si vous en avez.',
    ],
    p3: 'Je vous répondrai personnellement dès que possible.',
    wa: 'Vous préférez WhatsApp ?',
    cta: 'Répondre à Moubarack',
    mailSubject: 'Mon projet',
    bye: 'Au plaisir de vous lire,',
    role: 'Développeur Full-Stack · Freelance',
    foot: 'Vous recevez ce message car vous avez rempli le formulaire de contact de mon portfolio. Si ce n’est pas vous, ignorez simplement cet e-mail.',
  },
  en: {
    subject: (n) => `Thanks for visiting, ${n} — let’s talk about your project`,
    preheader: 'I’d love to hear more about what you have in mind.',
    hello: (n) => `Hello ${n},`,
    p1: 'Thank you for taking the time to visit my portfolio — it’s a real pleasure to have you here.',
    p2: 'I’d love to hear more about what you have in mind. Whether it’s a rough idea or a project already well underway, let’s simply talk about it, no strings attached.',
    ask: 'To get started, just reply to this email and tell me:',
    bullets: [
      'what you would like to build;',
      'who it is for, and in what context;',
      'your timeline, if you have one.',
    ],
    p3: 'I’ll reply to you personally as soon as I can.',
    wa: 'Prefer WhatsApp?',
    cta: 'Reply to Moubarack',
    mailSubject: 'My project',
    bye: 'Looking forward to hearing from you,',
    role: 'Full-Stack Developer · Freelance',
    foot: 'You are receiving this message because you filled in the contact form on my portfolio. If this wasn’t you, simply ignore this email.',
  },
};

function visitorMail(name, lang, ownerEmail) {
  const c = COPY[lang];
  const first = name.split(' ')[0];
  const mailto = `mailto:${ownerEmail}?subject=${encodeURIComponent(c.mailSubject)}`;

  const text = [
    c.hello(name),
    '',
    c.p1,
    '',
    c.p2,
    '',
    c.ask,
    ...c.bullets.map((b) => `  - ${b}`),
    '',
    c.p3,
    `${c.wa} ${WHATSAPP_LABEL} (${WHATSAPP_URL})`,
    '',
    c.bye,
    OWNER_NAME,
    c.role,
    '',
    '—',
    c.foot,
  ].join('\n');

  const html = `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(c.subject(first))}</title></head>
<body style="margin:0;padding:0;background:${T.forest900};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(c.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${T.forest900};padding:32px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;font-family:'Instrument Sans',Arial,Helvetica,sans-serif;">
      <tr><td style="background:${T.forest800};border-radius:22px 22px 0 0;padding:28px 32px;">
        <div style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:${T.violetSoft};font-weight:700;">Portfolio</div>
        <div style="font-size:26px;line-height:1.1;color:${T.sand};font-weight:700;margin-top:6px;">${esc(OWNER_NAME)}</div>
        <div style="font-size:14px;color:${T.sandDim};margin-top:4px;">${esc(c.role)}</div>
      </td></tr>
      <tr><td style="background:${T.sand};padding:32px;color:${T.ink};font-size:16px;line-height:1.65;">
        <p style="margin:0 0 16px;font-size:20px;font-weight:700;">${esc(c.hello(name))}</p>
        <p style="margin:0 0 16px;">${esc(c.p1)}</p>
        <p style="margin:0 0 16px;">${esc(c.p2)}</p>
        <p style="margin:0 0 8px;font-weight:700;">${esc(c.ask)}</p>
        <ul style="margin:0 0 20px;padding-left:20px;">
          ${c.bullets.map((b) => `<li style="margin:0 0 4px;">${esc(b)}</li>`).join('')}
        </ul>
        <p style="margin:0 0 24px;">${esc(c.p3)}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr>
          <td style="background:${T.violet};border-radius:999px;">
            <a href="${esc(mailto)}" style="display:inline-block;padding:14px 26px;color:${T.paper};font-weight:700;text-decoration:none;font-size:15px;">${esc(c.cta)}</a>
          </td>
        </tr></table>
        <p style="margin:0 0 24px;font-size:15px;">${esc(c.wa)} <a href="${WHATSAPP_URL}" style="color:${T.ink};font-weight:700;">${WHATSAPP_LABEL}</a></p>
        <p style="margin:0;">${esc(c.bye)}<br><strong>${esc(OWNER_NAME)}</strong></p>
      </td></tr>
      <tr><td style="background:${T.forest800};border-radius:0 0 22px 22px;padding:20px 32px;color:${T.skyDim};font-size:12px;line-height:1.6;">${esc(c.foot)}</td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  return { subject: c.subject(first), text, html };
}

function ownerMail(name, email, lang) {
  const when = new Date().toISOString();
  const text = `Nouveau contact depuis ton portfolio\n\nNom : ${name}\nE-mail : ${email}\nLangue : ${lang}\nDate : ${when}\n\nRéponds directement à ce message pour écrire au visiteur.`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:${T.ink};font-size:15px;line-height:1.6">
    <h2 style="margin:0 0 12px">Nouveau contact depuis ton portfolio</h2>
    <p style="margin:0"><strong>Nom :</strong> ${esc(name)}</p>
    <p style="margin:0"><strong>E-mail :</strong> <a href="mailto:${esc(email)}">${esc(email)}</a></p>
    <p style="margin:0"><strong>Langue :</strong> ${esc(lang)}</p>
    <p style="margin:0 0 12px"><strong>Date :</strong> ${esc(when)}</p>
    <p style="margin:0;color:${T.inkMute}">Réponds directement à ce message pour écrire au visiteur.</p>
  </div>`;
  return { subject: `Nouveau contact portfolio : ${name}`, text, html };
}

/* ---------- Handler ---------- */
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }
  body = body && typeof body === 'object' ? body : {};

  const lang = body.lang === 'en' ? 'en' : 'fr';

  // Pièges anti-robots : champ invisible rempli, ou formulaire envoyé trop vite.
  // On répond "ok" sans rien envoyer pour ne rien révéler au robot.
  if (body.company || Number(body.elapsed) < 1500) {
    return res.status(200).json({ ok: true });
  }

  const name = cleanName(body.name);
  const email = String(body.email == null ? '' : body.email).trim().toLowerCase();

  if (name.length < 2 || name.length > 80 || /https?:\/\/|www\./i.test(name)) {
    return res.status(400).json({ ok: false, error: 'invalid_name' });
  }
  if (!validEmail(email)) {
    return res.status(400).json({ ok: false, error: 'invalid_email' });
  }

  if (limited(ipHits, clientIp(req), 5, 10 * 60 * 1000) || limited(emailHits, email, 2, 60 * 60 * 1000)) {
    return res.status(429).json({ ok: false, error: 'rate_limited' });
  }

  const user = process.env.GMAIL_USER;
  const pass = String(process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
  const ownerEmail = process.env.OWNER_EMAIL || user;
  const local = !process.env.VERCEL; // en local, on renvoie la cause exacte pour t'aider à déboguer
  if (!user || !pass) {
    console.error('[contact] GMAIL_USER / GMAIL_APP_PASSWORD manquants (fichier .env introuvable ou mal rempli ?)');
    return res.status(500).json({ ok: false, error: 'not_configured', ...(local && { hint: 'GMAIL_USER / GMAIL_APP_PASSWORD manquants' }) });
  }

  const tx = getTransporter(user, pass);
  const from = `"${OWNER_NAME}" <${user}>`;
  const v = visitorMail(name, lang, ownerEmail);
  const o = ownerMail(name, email, lang);

  const results = await Promise.allSettled([
    tx.sendMail({ from, to: email, replyTo: ownerEmail, subject: v.subject, text: v.text, html: v.html }),
    tx.sendMail({ from, to: ownerEmail, replyTo: email, subject: o.subject, text: o.text, html: o.html }),
  ]);

  const [toVisitor, toOwner] = results;
  if (toVisitor.status === 'rejected') console.error('[contact] mail visiteur :', toVisitor.reason && toVisitor.reason.message);
  if (toOwner.status === 'rejected') console.error('[contact] mail propriétaire :', toOwner.reason && toOwner.reason.message);

  if (toVisitor.status === 'rejected' && toOwner.status === 'rejected') {
    const why = (toVisitor.reason && toVisitor.reason.message) || 'inconnue';
    return res.status(500).json({ ok: false, error: 'send_failed', ...(local && { hint: why }) });
  }
  return res.status(200).json({ ok: true });
};
