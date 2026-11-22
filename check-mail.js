'use strict';

/**
 * Diagnostic de l'envoi d'e-mails.   Lance :   npm run check-mail
 * Vérifie le fichier .env, la connexion à Gmail, et dit précisément ce qui ne va pas.
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
console.log('\n1) Fichier .env');
if (!fs.existsSync(envPath)) {
  const hasExample = fs.existsSync(path.join(__dirname, '.env.example'));
  console.log('   ✗ Introuvable : ' + envPath);
  console.log('   → Crée un fichier nommé exactement ".env" (pas ".env.txt", pas ".env.example") à la racine du projet.');
  if (hasExample) console.log('   → Astuce : copie ".env.example" et renomme la copie en ".env".');
  process.exit(1);
}
fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach((line) => {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
  if (m && !line.trim().startsWith('#')) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});
console.log('   ✓ Trouvé');

const user = (process.env.GMAIL_USER || '').trim();
const pass = String(process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

console.log('\n2) Variables');
if (!user) { console.log('   ✗ GMAIL_USER est vide'); process.exit(1); }
console.log('   ✓ GMAIL_USER = ' + user);
if (!pass || /^x+$/i.test(pass)) { console.log('   ✗ GMAIL_APP_PASSWORD est vide ou contient encore l\'exemple "xxxx xxxx xxxx xxxx"'); process.exit(1); }
if (pass.length !== 16) {
  console.log(`   ! GMAIL_APP_PASSWORD fait ${pass.length} caractères (un mot de passe d'application en fait 16).`);
  console.log('     Tu as peut-être mis ton mot de passe Gmail normal : ça ne marche pas, il faut un "mot de passe d\'application".');
} else {
  console.log('   ✓ GMAIL_APP_PASSWORD : 16 caractères');
}

console.log('\n3) Connexion à Gmail (smtp.gmail.com)');
let nodemailer;
try { nodemailer = require('nodemailer'); } catch (e) { console.log('   ✗ nodemailer n\'est pas installé → lance "npm install"'); process.exit(1); }

const tx = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user, pass }, connectionTimeout: 15000 });
tx.verify()
  .then(() => {
    console.log('   ✓ Connexion réussie : Gmail accepte ton mot de passe d\'application.');
    const to = process.env.OWNER_EMAIL || user;
    return tx.sendMail({ from: `"Test portfolio" <${user}>`, to, subject: 'Test portfolio — ça marche !', text: 'Si tu lis ce message, l\'envoi d\'e-mails fonctionne.' }).then(() => {
      console.log(`\n4) ✓ E-mail de test envoyé à ${to}. Vérifie ta boîte (et les spams).\n`);
    });
  })
  .catch((err) => {
    console.log('   ✗ Échec : ' + err.message + (err.responseCode ? ` (code ${err.responseCode})` : ''));
    if (err.responseCode === 535 || /Invalid login|BadCredentials|Username and Password/i.test(err.message)) {
      console.log('\n   Causes les plus fréquentes :');
      console.log('   • La validation en 2 étapes n\'est pas activée sur ce compte Google (obligatoire pour créer un mot de passe d\'application).');
      console.log('   • Tu as mis ton mot de passe Gmail normal au lieu du mot de passe d\'application à 16 caractères.');
      console.log('   • Le mot de passe d\'application a été créé sur un AUTRE compte Google que GMAIL_USER.');
      console.log('   • Le mot de passe a été recopié avec une erreur : supprime-le sur https://myaccount.google.com/apppasswords et crée-en un nouveau.');
    } else if (/ENOTFOUND|ETIMEDOUT|ECONNREFUSED|EAI_AGAIN|ESOCKET|ECONNRESET/i.test(err.code || err.message)) {
      console.log('\n   Problème de réseau : vérifie ta connexion Internet. Certains antivirus, pare-feu ou réseaux d\'école bloquent le port 465.');
      console.log('   → Essaie avec un partage de connexion du téléphone.');
    }
    process.exit(1);
  });
