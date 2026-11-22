'use strict';

/**
 * Serveur de développement local (aucune dépendance en plus de nodemailer).
 *   npm install
 *   copie .env.example en .env et remplis-le
 *   npm run dev   ->   http://localhost:3000
 *
 * En production (Vercel), ce fichier n'est pas utilisé : Vercel sert /public
 * et exécute api/contact.js comme fonction serverless.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Mini lecteur de .env (évite d'ajouter la dépendance "dotenv")
try {
  const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  envFile.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  });
} catch (e) {
  /* pas de .env : ok pour tester uniquement le front */
}

const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT) || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function readBody(req, limit = 10 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('payload_too_large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function decorate(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (obj) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(obj));
    return res;
  };
  return res;
}

const server = http.createServer(async (req, res) => {
  decorate(res);
  const url = new URL(req.url, `http://${req.headers.host}`);

  // --- API ---
  if (url.pathname === '/api/contact') {
    try {
      const raw = req.method === 'POST' ? await readBody(req) : '';
      try {
        req.body = raw ? JSON.parse(raw) : {};
      } catch (e) {
        req.body = {};
      }
      delete require.cache[require.resolve('./api/contact.js')]; // recharge à chaque appel en dev
      await require('./api/contact.js')(req, res);
    } catch (err) {
      console.error(err);
      if (!res.headersSent) res.status(500).json({ ok: false, error: 'server_error' });
    }
    return;
  }

  // --- Fichiers statiques ---
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const filePath = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.statusCode = 403;
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.end('404 — introuvable');
    }
    res.setHeader('Content-Type', MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n  Portfolio prêt  ->  http://localhost:${PORT}\n`);
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log('  (!) GMAIL_USER / GMAIL_APP_PASSWORD absents : le formulaire ne pourra pas envoyer de mails.\n');
  }
});
