/**
 * Données du portfolio — c'est ICI que tu modifies tes contacts, tes niveaux et tes vidéos.
 * Les textes (titres, descriptions) sont dans i18n.js (français + anglais).
 */

export const SITE = {
  email: 'moubarackilatem@gmail.com',
  whatsapp: '2290169892699', // format international, sans "+" ni espaces
  whatsappDisplay: '+229 01 69 89 26 99',
};

/**
 * Projets. `driveId` = l'identifiant dans le lien Google Drive :
 * https://drive.google.com/file/d/<driveId>/view
 * (la vidéo doit être partagée en « Toute personne disposant du lien »).
 */
export const PROJECTS = [
  { id: 'event', n: '01', driveId: '1C-EIBQfgJtmF9cySFndc2IkrkYg_8e_c' },
  { id: 'commercial', n: '02', driveId: '1lxqudhNvqoITkPawP8rvmYGKX4y8DTaz' },
  { id: 'bus', n: '03', driveId: '15-SztEFpetthDUKls3DIlMHr4-Hp1gIs' },
  { id: 'school', n: '04', driveId: '1aD_YDItnPdmNbaBQd5L-V38PSaoP5-qQ' },
];

/**
 * Compétences. `level` = niveau de 1 à 5 (les barres violettes).
 * Ce sont des estimations par palier : ajuste-les librement.
 * `name` peut être un texte simple ou { fr, en }.
 */
export const SKILLS = [
  {
    id: 'mastered',
    items: [
      { abbr: 'JV', name: 'Java', level: 4 },
      { abbr: 'PHP', name: 'PHP & MySQL', level: 4 },
      { abbr: 'JS', name: 'JavaScript', level: 4 },
      { abbr: 'SB', name: 'Spring Boot', level: 4 },
      { abbr: 'RE', name: 'React', level: 4 },
      { abbr: 'NS', name: 'NestJS', level: 4 },
      { abbr: 'UM', name: 'UML & Merise', level: 4 },
      { abbr: 'EL', name: { fr: 'Electron (desktop)', en: 'Electron (desktop)' }, level: 4 },
    ],
  },
  {
    id: 'explored',
    items: [
      { abbr: 'C', name: 'C', level: 3 },
      { abbr: 'C++', name: 'C++', level: 3 },
      { abbr: 'PY', name: { fr: 'Python (web)', en: 'Python (web)' }, level: 3 },
      { abbr: 'FL', name: 'Flutter · Dart', level: 3 },
      { abbr: 'LV', name: 'Laravel', level: 3 },
    ],
  },
  {
    id: 'learning',
    items: [
      { abbr: 'ML', name: 'Machine Learning', level: 2 },
      { abbr: 'DB', name: { fr: 'Administration de bases de données', en: 'Database administration' }, level: 2 },
    ],
  },
  {
    id: 'bonus',
    items: [
      { abbr: 'AI', name: { fr: 'IA & productivité', en: 'AI & productivity' }, level: 4 },
      { abbr: 'VD', name: { fr: 'Montage vidéo', en: 'Video editing' }, level: 3 },
      { abbr: 'DS', name: 'Design', level: 3 },
      { abbr: 'NW', name: { fr: 'Réseaux · Cisco Packet Tracer', en: 'Networking · Cisco Packet Tracer' }, level: 3 },
      { abbr: 'DO', name: 'DevOps', level: 3 },
    ],
  },
];

/** Bandeau défilant (technologies) */
export const MARQUEE = [
  'Java', 'Spring Boot', 'React', 'NestJS', 'JavaScript', 'PHP', 'MySQL', 'Electron',
  'Flutter', 'Laravel', 'Python', 'C / C++', 'UML', 'Merise', 'Machine Learning', 'DevOps',
];
