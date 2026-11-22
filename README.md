# Portfolio 3D — Moubarack ILATEMA (version vert forêt)

Portfolio interactif façon jeu : un monde 3D (three.js) que l'on traverse en défilant, 5 « niveaux »,
barre d'XP, compétences en barres de niveau, projets en vidéo (Google Drive), site bilingue FR / EN,
et un formulaire (nom + e-mail) qui envoie automatiquement un e-mail au visiteur via **Gmail (SMTP)**.

- **Palette** : vert forêt 60 % · beige sable 30 % · violet électrique 10 %
- **Style** : design plat — aucune ombre, aucun dégradé, aucun flou (3D en aplats avec contours)
- **Police** : Instrument Sans
- **Coût** : 0 € (Vercel gratuit + Gmail gratuit, aucune carte bancaire)

---

## 1. Créer le mot de passe d'application Gmail (5 minutes)

Gmail n'accepte pas ton vrai mot de passe pour envoyer des mails depuis un site. Il faut un « mot de passe d'application » :

1. Va sur <https://myaccount.google.com/security> avec le compte `moubarackilatem@gmail.com`.
2. Active la **validation en 2 étapes** si ce n'est pas déjà fait.
3. Va sur <https://myaccount.google.com/apppasswords> (ou cherche « Mots de passe des applications »).
4. Donne un nom (ex. « Portfolio »), clique sur **Créer**.
5. Google affiche **16 caractères** (ex. `abcd efgh ijkl mnop`). **Copie-les maintenant** : ils ne seront plus affichés.

> Ne partage jamais ce mot de passe et ne le mets jamais dans le code : il va uniquement dans les variables d'environnement.

---

## 2. Tester en local

Il faut [Node.js](https://nodejs.org) 18 ou plus.

```bash
npm install
cp .env.example .env      # puis ouvre .env et colle ton mot de passe d'application
npm run dev
```

Ouvre <http://localhost:3000>. Remplis le formulaire avec **une autre adresse e-mail à toi** pour vérifier
que le mail arrive bien (regarde aussi les spams).

---

### Si l'envoi échoue : lance le diagnostic

```bash
npm run check-mail
```

Ce script lit ton `.env`, teste la connexion à Gmail et t'indique la cause exacte (fichier `.env` mal nommé,
mot de passe d'application refusé, validation en 2 étapes absente, réseau bloqué…). Il envoie aussi un
e-mail de test. En local, le détail de l'erreur s'affiche aussi dans le terminal où tourne `npm run dev`
(lignes `[contact] …`) et dans la console du navigateur (F12).

Après toute modification du `.env`, **arrête puis relance** `npm run dev` (Ctrl + C, puis `npm run dev`).

---

## 3. Mettre en ligne gratuitement (Vercel)

1. Crée un dépôt sur GitHub et envoie-y ce dossier (le fichier `.env` n'est **pas** envoyé, c'est voulu).
2. Va sur <https://vercel.com>, connecte-toi avec GitHub, clique sur **Add New → Project** et choisis ton dépôt.
3. Avant de cliquer sur **Deploy**, ouvre **Environment Variables** et ajoute :

   | Nom | Valeur |
   |---|---|
   | `GMAIL_USER` | `moubarackilatem@gmail.com` |
   | `GMAIL_APP_PASSWORD` | les 16 caractères du mot de passe d'application |
   | `OWNER_EMAIL` | *(optionnel)* l'adresse qui reçoit la copie de chaque contact |

4. Clique sur **Deploy**. Tu obtiens une adresse du type `ton-projet.vercel.app`.

Alternative sans GitHub : `npx vercel` dans le dossier du projet, puis ajoute les variables dans
*Project → Settings → Environment Variables* et relance avec `npx vercel --prod`.

---

## 4. Personnaliser

**Couleurs** : tout est centralisé dans le bloc `:root` en haut de `public/css/style.css`
(`--forest-*`, `--sand*`, `--violet*`…). Change la valeur d'une variable et tout le site suit, **y compris la 3D**
(elle lit ces variables). Deux endroits à aligner à la main si tu changes de palette :
les couleurs des e-mails (objet `T` en haut de `api/contact.js`) et la `theme-color` / `favicon.svg`.

Tout se règle dans `public/js/` :

| Fichier | Ce que tu y modifies |
|---|---|
| `data.js` | Contacts, **liens des vidéos Drive**, compétences et **niveaux (1 à 5)**, bandeau défilant |
| `i18n.js` | Tous les textes, en français et en anglais |

Les niveaux des compétences sont des estimations par palier (maîtrisé = 4, exploré = 3, en formation = 2) :
ajuste-les comme tu le souhaites.

**Vidéos Google Drive** : chaque fichier doit être partagé en « Toute personne disposant du lien ».
Pour remplacer une vidéo, change seulement l'identifiant `driveId` (la partie entre `/d/` et `/view` du lien).

**Photo** : remplace `public/assets/moubarack.jpg` (900 × 1350) et `moubarack-sm.jpg` (480 × 720).

---

## 5. Bon à savoir sur l'envoi d'e-mails

- **Limite Gmail** : environ 500 e-mails par jour pour un compte gratuit, largement suffisant.
- **Spams** : au début, les premiers mails peuvent atterrir dans les courriers indésirables, car l'expéditeur
  est une adresse Gmail récente pour ce site. Avec un nom de domaine à toi, tu pourras passer plus tard sur
  Brevo ou un SMTP de domaine pour une meilleure délivrabilité.
- **Protection anti-spam intégrée** : champ piège invisible, délai minimal avant envoi, limite de
  5 envois / 10 min par visiteur et 2 envois / heure par adresse e-mail, nettoyage du nom. La limitation
  fonctionne « au mieux » (mémoire de la fonction serverless) : si un jour tu es la cible d'abus,
  ajoute Cloudflare Turnstile (gratuit).
- **Chaque contact te revient** : tu reçois un mail « Nouveau contact portfolio » avec le nom et l'e-mail
  du visiteur ; en cliquant sur *Répondre*, tu écris directement à cette personne.

## 6. Structure

```
api/contact.js        Fonction serverless : validation + envoi des e-mails (Nodemailer / Gmail)
public/index.html     Page unique
public/css/style.css  Design (palette, responsive, animations)
public/js/scene.js    Monde 3D three.js
public/js/main.js     Interactions : loader, niveaux, XP, projets, formulaire
public/js/data.js     Tes données (contacts, vidéos, compétences)
public/js/i18n.js     Textes FR / EN
dev-server.js         Serveur local (npm run dev)
vercel.json           Configuration de l'hébergement
```

Le site accède à three.js et à la police Instrument Sans via des CDN (jsDelivr et Google Fonts) : il faut
donc une connexion Internet pour les voir. Si la 3D ne peut pas se charger, le site reste entièrement
utilisable avec un fond vert uni de secours.
