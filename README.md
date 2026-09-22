# LEA Aesthetic

Aperçu de livraison actif : http://localhost:3002 (serveur de production local). Le développement utilise normalement le port 3000.

Site multilingue de coordination de projets de chirurgie esthétique à Istanbul, avec le français par défaut et un panneau de gestion privé sur **/admin**. Next.js 16 (App Router), React, TypeScript et CSS avec variables de thème. Les pages sont rendues côté serveur à partir du contenu publié : les modifications du panneau apparaissent sans rebuild. Le dossier initial était vide, sans dépôt ni intégration à réutiliser. Next.js a été choisi pour la cible Vercel demandée. Aucun déploiement public n’a été effectué.

## Démarrer

Node.js **24** et npm (le stockage local utilise `node:sqlite`).

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Sous PowerShell : `Copy-Item .env.example .env.local`. Ouvrir http://localhost:3000. Sans configuration, le formulaire annonce son indisponibilité ; téléphone, WhatsApp et Instagram fonctionnent. Pour une démonstration locale du formulaire : définir `CONTACT_TRANSPORT=mock` dans `.env.local` et redémarrer. Le site annonce explicitement la simulation, sans e-mail réel.

```sh
npm run build
npm start
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
```

Arrêter le serveur de développement avant un build dans le même dossier de sortie. Les tests E2E lancent automatiquement un serveur mock isolé sur 3001 (`.next-e2e`) et couvrent ordinateur et mobile. Ils n’envoient aucun e-mail réel. `PLAYWRIGHT_EXECUTABLE_PATH` permet de réutiliser un Chromium déjà installé. `NEXT_DIST_DIR` permet de séparer un build local de vérification du serveur de prévisualisation.

## Administrer le site

1. Ouvrir **http://localhost:3002/admin** pour l’aperçu livré, ou `/admin` sur le serveur de développement.
2. Au premier accès, copier le code privé généré dans `.data/admin-setup-token.txt`, puis choisir votre adresse e-mail et votre propre mot de passe (12 caractères minimum). Aucun compte ni mot de passe par défaut. Sur Vercel, le code est fourni par `ADMIN_SETUP_TOKEN` (32 caractères aléatoires minimum).
3. Modifier les rubriques, **Enregistrer**, **Activer l’aperçu**, puis **Voir l’aperçu**. Cet aperçu exige la session administrateur et reste privé. Le bouton **Quitter l’aperçu** rétablit l’affichage publié dans votre navigateur.
4. **Publier** présente les groupes modifiés avant confirmation. Toutes les modifications enregistrées sont publiées ensemble. Une restauration dans **Historique** devient d’abord un brouillon ; publier ensuite pour la rendre visible.

Le panneau gère tous les textes éditoriaux des pages, les coordonnées et liens Instagram/WhatsApp, les titres et descriptions SEO, l’ordre/visibilité des blocs d’accueil, les interventions, guides visuels, FAQ, étapes du parcours, navigation, en-tête, pied de page, invitations au contact, libellés du formulaire, page 404 et images. Les neuf adresses d’interventions initiales sont protégées : elles peuvent être masquées. De nouvelles fiches peuvent être ajoutées. Les listes peuvent être réordonnées ; les FAQ choisies sont affichées à l’accueil. Les messages opérationnels de validation et les protections du formulaire restent gérés par le code.

Les photos se chargent dans **Images et logo**, puis sont attribuées à un emplacement. Les images et leurs descriptions accessibles sont également modifiables directement dans chaque fiche **Interventions**. Formats JPEG/PNG/WebP, 5 Mo et 25 mégapixels maximum ; réencodage en WebP, retrait des métadonnées, taille limitée à 2 200 px. Aucun document PDF ou SVG accepté. Une image ajoutée reste accessible uniquement à l’administrateur jusqu’à son utilisation dans une version publiée. La suppression est refusée si le média est utilisé dans le brouillon, le site ou l’une des 30 versions conservées. Les aperçus d’images passent directement par le navigateur authentifié. Mettre à jour les textes alternatifs dans les pages correspondantes après remplacement.

### Opérations pour homme

La catégorie **Opérations pour homme** ajoute trois fiches administrables : Liposuccion VASER HD, J-Plasma et Six Pack. Elles suivent les routes et le modèle existants : `/interventions/liposuccion-vaser-hd`, `/interventions/j-plasma` et `/interventions/six-pack`. Le contenu médical reste général et renvoie l’indication, les risques et les suites à l’évaluation du chirurgien.

Les trois fichiers `public/images/operation-homme-*.webp` sont des illustrations éditoriales générées pour la mise en page. Ils ne montrent ni patient, ni résultat avant/après, ni établissement. Les remplacer depuis le panneau par des images de la clinique dont les droits sont confirmés avant une publication commerciale ; conserver un texte alternatif descriptif. Les versions anglaise, italienne, espagnole, portugaise, russe et turque sont incluses dans les dictionnaires du site.

### Guides visuels des interventions

Les 17 infographies uniques fournies le 19 septembre sont conservées en WebP haute qualité dans `public/images/guides/`. La seconde copie VASER homme, strictement identique, a été retirée. L’administrateur peut modifier leur titre, catégorie, résumé, image, description accessible, intervention associée, ordre et visibilité, puis enregistrer et publier comme les autres contenus. Les guides associés à une fiche apparaissent aussi dans la page détaillée correspondante.

Le portrait du Dr Teoman Eraslan et les 17 guides ont été convertis de JPEG vers WebP haute qualité en conservant leurs dimensions. Avec le retrait du doublon, ces ressources passent de 3,30 Mo à 2,41 Mo, soit environ 27 % de données en moins. Une migration remplace automatiquement les anciennes adresses JPEG dans les brouillons et publications déjà enregistrés.

Ces images sont présentées comme des **illustrations pédagogiques**. Elles ne sont pas utilisées comme résultats de patients et ne confirment pas qu’une intervention est proposée. Un avertissement visible précise que la technique, les indications, les risques et les suites relèvent d’une évaluation médicale individuelle. Les promesses imprimées dans les fichiers sources ne sont pas reprises comme affirmations éditoriales du site. L’interface, les titres et les textes d’accompagnement sont disponibles dans les sept langues ; l’image elle-même reste en français et ce point est indiqué dans l’affichage agrandi.

Les contenus partagés se règlent dans **Éléments communs**. Le résumé du chirurgien sur l’accueil et sa biographie détaillée sont des textes éditoriaux distincts : les actualiser ensemble si ses informations changent. Le portrait est commun. Les couleurs et la structure des modèles restent dans le code ; le panneau n’exécute jamais du HTML ou du JavaScript saisi. Le numéro WhatsApp et le téléphone sont deux champs explicites, à maintenir cohérents.

La signature **Health Türkiye** du pied de page est un visuel partagé, remplaçable dans **Images et logo**. Sa présentation discrète ne comporte ni revendication de certification de LEA ni lien ajouté sans source. Le fichier public est une version WebP optimisée du visuel fourni le 13 septembre 2026 ; confirmer les conditions d’utilisation de la marque avant une mise en production publique.

### Galerie avant / après

La section de l’accueil `/#avant-apres` se gère dans **Avant / après**. Ajouter un dossier, choisir l’intervention et le format : deux photos locales « avant » / « après », ou le lien exact d’une publication Instagram (`/p/…/` ou `/reel/…/`). La médiathèque et le téléversement sont accessibles dans cet éditeur. Renseigner titre, descriptions alternatives, légende factuelle, source/crédit et, seulement s’il est connu, délai de la photo après. Aucun nom de patient ni document médical n’est demandé.

Les dossiers commencent masqués et acceptent un brouillon incomplet. Pour les rendre visibles, l’administrateur confirme l’authenticité du cas et les droits/autorisation de diffusion, coche la visibilité, enregistre et publie. Ces confirmations sont des déclarations de l’exploitant, pas une vérification médicale automatisée. Remplacer les photos, la publication ou la source remet les confirmations à zéro ; le serveur protège aussi ce changement. La restauration d’une ancienne version et l’import d’une sauvegarde remettent tous les dossiers en attente de confirmation. Réordonner avec les flèches ; la visibilité et l’ordre de la section se règlent aussi dans **Accueil**. Les filtres par intervention et l’agrandissement des deux photos sont utilisables au clavier et sur mobile.

Les médias de dossiers masqués, non autorisés ou d’une galerie masquée sont privés après publication de la modification. Les images sont servies avec `no-store`, sans cache de l’optimiseur ; `images.localPatterns` interdit également de demander directement à cet optimiseur une copie de `/media/…`. Les versions conservées protègent les médias contre une suppression accidentelle, mais ne les rendent pas publics. Un retrait ne peut pas effacer des copies déjà enregistrées par un visiteur.

Instagram n’est chargé qu’après **Afficher la publication** : aucune requête vers Meta avant ce clic. Le lecteur peut ensuite traiter l’IP et ses propres cookies ; un avertissement et un lien externe de secours restent disponibles. La page de confidentialité décrit ce fonctionnement. Aucun jeton Instagram n’est requis ; il n’y a ni synchronisation automatique ni import de photos d’autres établissements. Une publication supprimée, privée ou non intégrable peut rester consultable uniquement via son lien externe.

`src/lib/cms/migrations.ts` ajoute la galerie aux anciennes bases sans remplacer leurs textes ni leur ordre personnalisé. Trois comparaisons fournies directement par LEA le 22 septembre 2026 sont installées une seule fois : une greffe capillaire et deux vues du même lifting du tiers moyen. Les quatre fichiers reçus sont recadrés en six vues cohérentes, convertis en WebP sans métadonnées et stockés comme médias protégés dans la base. Aucun délai postopératoire n’est inventé. Ils restent modifiables, réordonnables, masquables ou supprimables depuis l’administration. Si aucun cas n’est publié, le site affiche une invitation vers le compte officiel. Les images géométriques utilisées dans les tests sont réservées aux bases isolées `.data/e2e-*`.

Les médias initiaux sont générés par `scripts/build-transformation-media.mjs` dans `src/content/transformation-media.json`, puis créés automatiquement dans une base locale ou PostgreSQL lorsqu’une transformation les référence. Les originaux WhatsApp restent hors du dossier public. Le remplacement d’une image dans l’administration retire automatiquement les confirmations de publication jusqu’à une nouvelle validation.

Trois liens du compte `@lea__aesthetics` ont été relevés dans sa grille publique : [liposuccion 360° / abdominoplastie](https://www.instagram.com/lea__aesthetics/reel/Dc_I4BJNrSh/), [augmentation mammaire](https://www.instagram.com/lea__aesthetics/reel/DcwGZcptqwV/) et [liposuccion Vaser](https://www.instagram.com/lea__aesthetics/reel/Dcbkib-DbO-/). Ils sont préremplis **en brouillons masqués**, dans la base locale, avec leurs sources et sans date ni délai inventé. Le premier reel a été ouvert et sa légende observée ; les deux autres sont identifiés par la grille. Aucun n’est présenté comme un couple avant/après vérifié. LEA doit vérifier le contenu complet et l’autorisation de diffusion avant activation. Aucun média d’un autre établissement n’est utilisé.

Ces candidats éditables sont aussi conservés dans `src/content/instagram-candidates.json`. Après le premier démarrage d’une nouvelle instance, `node scripts/prepare-instagram-drafts.mjs` permet de les ajouter au brouillon sans publication, sans doublons de liens et sans écraser les contenus existants. Le BBL aperçu dans la grille reste une intervention candidate à confirmer, hors des six fiches actives. La disponibilité des lecteurs Instagram dépend de Meta ; leurs états de chargement et leur lien de secours sont testés avec un lecteur simulé, sans appel à Meta dans les tests automatisés.

### Stockage, sécurité et sauvegardes

- **Local** : `.data/lea.sqlite` (et fichiers WAL associés), persistant entre redémarrages. `CMS_DATA_DIR` permet un répertoire persistant dédié. Ne jamais le placer dans `public/` ni le commiter.
- **Vercel** : PostgreSQL persistant via `DATABASE_URL` avec TLS, obligatoire pour l’administration. Le stockage local éphémère de Vercel est refusé. Aucun projet cloud tiers existant n’a été réutilisé. Sans base configurée, les pages montrent les contenus initiaux et le panneau indique la configuration manquante ; une panne d’une base configurée ne réinitialise jamais silencieusement les contenus.
- Table applicative `lea_cms` : contenus, médias, versions, compte propriétaire, sessions et compteurs. Création automatique avec les droits SQL nécessaires ; requêtes paramétrées et transactions. SQLite sérialise aussi ses lectures pour ne pas exposer de transaction non validée. PostgreSQL utilise un verrou transactionnel pour les opérations CMS. Les enregistrements concurrents sont refusés avec un conflit de version.
- Mot de passe dérivé avec scrypt et sel aléatoire. Session opaque aléatoire de 256 bits, empreinte stockée en base, expiration après 8 h ; cookie `HttpOnly`, `SameSite=Strict`, `Secure` en production. Contrôles d’origine et de jeton CSRF sur chaque mutation. Dix tentatives de connexion/installation/changement de mot de passe par 15 minutes et identité de comptage ; compteur persistant. Hors Vercel, le compteur est partagé entre clients pour ne pas faire confiance à un en-tête IP arbitraire. Le changement de mot de passe révoque toutes les sessions.
- Le panneau utilise un compte propriétaire unique. Il n’inclut ni inscriptions visiteurs, ni rôles multiples, ni réinitialisation par e-mail. Conserver le mot de passe dans un gestionnaire. Une récupération exceptionnelle nécessite une intervention de l’exploitant sur la base, la révocation des sessions et un nouveau code d’installation ; aucune porte dérobée de récupération n’est exposée.
- `npm run cms:export` crée une sauvegarde JSON privée dans `.data/` avec contenus, médias et historique, **sans** compte, sessions ou code d’installation. `npm run cms:export -- chemin.json` choisit le fichier. Les fichiers ne sont jamais écrasés.
- `npm run cms:import -- chemin.json` importe dans une **base vide**, avant de démarrer le site. L’import refuse toute base contenant déjà des données. Pour migrer en ligne : exporter en local, configurer `DATABASE_URL` vers une base PostgreSQL vide dans l’environnement du terminal, importer, puis créer le compte de cette instance. Utiliser uniquement une sauvegarde LEA de confiance de la même version applicative. Le script charge `.env.local` si présent. Sauvegarder aussi les médias originaux du projet et prévoir les sauvegardes de base chez l’hébergeur.

Les compteurs expirés sont remplacés lors de nouvelles tentatives et les sessions expirées sont purgées lors des connexions. Les 30 versions précédentes sont conservées automatiquement. Les règles de rétention, habilitations et sauvegardes de production restent à convenir avec LEA. La connexion PostgreSQL doit être testée avec les identifiants du projet retenu avant déploiement ; les essais de livraison utilisent SQLite local, pas une base cloud réelle.

## Certificats et autorisations (13 septembre 2026)

La nouvelle section de l’accueil, accessible avec `/#certificats`, se gère dans **Administration → Certificats et autorisations**. Elle permet l’ajout, le remplacement d’image, la modification, le réordonnancement, le masquage et le retrait de dossiers. Les textes de présentation et libellés sont éditables et traduits dans les sept langues. Chaque document public indique son titulaire exact, son émetteur, sa portée, sa référence, ses dates éventuelles et un lien vers la source officielle. Agrandissement accessible au clavier ; images non recadrées. En l’absence de documents publiables, un texte neutre invite à contacter LEA, sans revendiquer de certification.

L’administrateur doit vérifier l’original, le titulaire et la validité auprès de l’émetteur avant publication. Toute modification d’un document annule sa confirmation ; la restauration d’un historique remet les certificats en brouillon non vérifié. Les certificats expirés sont masqués automatiquement. Ce contrôle éditorial ne remplace pas une vérification indépendante auprès de l’organisme. Sources utiles : [ministère turc de la Santé](https://shgmturizmdb.saglik.gov.tr/) et [annuaire Joint Commission / JCI](https://www.jointcommission.org/en-us/about-us/recognizing-excellence/find-accredited-organizations).

**Les deux visuels reçus le 13 septembre ne sont pas publiés comme preuves.** `certif-lea-1.png` reprend le numéro ST-1995 du document antérieur nommé ÖZEL RAMİ HASTANESİ, avec LEA AESTHETIC comme titulaire. Le second fichier, nommé `Generated Image September 13, 2026 - 5_08PM.png`, comporte des signes de génération et un texte dédoublé. Aucun original ni enregistrement officiel correspondant à LEA n’est confirmé par ces visuels. Ils sont importés uniquement dans le brouillon et la médiathèque privés, avec une note de vérification et un blocage de publication côté serveur. Fournir des originaux authentiques et une source officielle identifiant le titulaire pour remplacer ces visuels. Ni la section ni les données structurées ne revendiquent actuellement une autorisation de LEA ou une accréditation JCI.

Sauvegarde préalable : `.data/before-certificates.json`. L’import local privé est réalisé par `scripts/prepare-certificate-review.mjs` ; les fichiers sources restent hors du dossier public. Les médias signalés sont refusés comme images publiques par l’API et restent inaccessibles aux visiteurs, même avec leur URL directe. Les sauvegardes conservent ce signalement. Les comptes et les autres contenus sont préservés.

Vérification : 23 tests unitaires réussis, deux parcours certificats et deux parcours galerie réussis sur ordinateur/mobile, TypeScript, lint et build de production réussis. Contrôle manuel du rendu public et des URL des deux visuels privés (404 pour les visiteurs). Les essais de publication utilisent uniquement des rectangles de test explicitement non médicaux, dans une base isolée.

## Langues et traductions

Le site propose le français (par défaut), l’anglais, l’italien, l’espagnol, le portugais européen, le russe et le turc. Le sélecteur avec un globe est accessible au clavier sur ordinateur et mobile. Il conserve la page, les paramètres du formulaire et les ancres. Aucun cookie de langue, redirection géographique ou service de traduction externe n’est ajouté.

- Les adresses françaises restent identiques. Les autres versions utilisent `/en`, `/it`, `/es`, `/pt`, `/ru` et `/tr` : par exemple `/it/interventions/rhinoplastie`. Les identifiants des interventions restent stables. Les anciens liens fonctionnent aussi avec ces préfixes ; `/fr/...` redirige vers l’adresse française habituelle.
- Dans **Administration → Langues et traductions**, choisir une langue, rechercher une phrase ou filtrer par section. Modifier la colonne de droite, **Enregistrer**, contrôler avec **Activer l’aperçu** et **Voir cette version**, puis **Publier**. Les modifications suivent le même historique et la même protection des brouillons que les autres contenus. **Rétablir** retire une personnalisation et revient à la traduction initiale.
- Le français se modifie dans les rubriques habituelles. Une phrase française nouvelle ou modifiée apparaît dans les textes à compléter ; son texte français est affiché en attendant. Les textes identiques partagent une traduction. Vider un champ puis le quitter rétablit la valeur initiale, lorsqu’elle existe. Les variables telles que `{intervention}` doivent être conservées.
- La case « Proposer cette langue » contrôle le sélecteur, les liens alternatifs et le sitemap. Les adresses de cette langue déjà partagées restent accessibles. Le français reste toujours proposé. Médias, autorisations de galerie, coordonnées et liens sont communs aux versions : aucune copie de patient ou permission supplémentaire n’est créée.
- Les six dictionnaires initiaux comptent chacun 460 textes dans `src/content/i18n/{langue}.json`. Ils couvrent les pages, interventions, galerie, FAQ, mentions légales, SEO, libellés, accessibilité et messages de formulaire. Les personnalisations sont stockées dans `content.translations` en base. `src/lib/i18n/catalog.ts` découvre les textes CMS éditables ; `ui-fr.json` recense les messages d’interface. `catalog.json` est la référence initiale pour la vérification des dictionnaires. Les légendes des publications Instagram restent celles de leur auteur ; seule l’interface du site est traduite.
- Le HTML est rendu côté serveur avec `lang`, les URL canoniques et les alternatives `hreflang`. Le plan du site inclut les langues proposées. Les aperçus sociaux sont traduits. Les sous-ensembles typographiques latin étendu et cyrillique sont hébergés dans le projet. Aucun réglage externe n’est nécessaire pour les traductions.
- Les contenus, brouillons et médias existants sont préservés lors de la migration automatique. Une sauvegarde locale privée a été créée avant l’ajout des langues : `.data/before-i18n.json`. Les sauvegardes/imports incluent les traductions, sans comptes ou sessions. Faire relire les contenus médicaux et juridiques traduits par les responsables avant publication définitive, comme pour le français.

## Vérifications de livraison

Ajout des langues vérifié le 10 septembre 2026 : **20 tests unitaires réussis**, TypeScript, ESLint et build de production réussis. Les **27 scénarios navigateur** sont passés (26 pendant le passage complet, puis le contrôle de liens interrompu par le redémarrage du serveur a réussi lors de sa relance ciblée ; un doublon du test de limitation reste volontairement ignoré sur ordinateur). Les pages publiques sont contrôlées dans les sept langues, avec leurs liens canoniques et alternatifs, menus mobiles, anciennes adresses et 404. L’édition d’une traduction, le brouillon privé, l’aperçu et la publication sont testés sur ordinateur et mobile. Le formulaire est validé avec acceptation simulée en anglais et en français. Les captures sont conservées dans `tmp/i18n-*.png`. L’aperçu de production a aussi été ouvert et son sélecteur testé sur `http://localhost:3002/`, sans erreur JavaScript détectée.

Vérifié le 22 septembre 2026 : builds local et Vercel réussis, TypeScript et ESLint sans erreur, **26 tests serveur et 29 scénarios navigateur réussis** (un contrôle de limitation de connexion volontairement exécuté une seule fois). Les scénarios couvrent ordinateur et mobile, navigation, fiches, liens WhatsApp/Instagram, anciennes ancres/redirection, FAQ, formulaire, accord obligatoire, simulation d’acceptation, erreurs et reprises. La galerie avant/après, les certificats et les guides visuels sont testés dans le panneau : médias privés, publication, filtrage, agrandissement, retrait, ordre, visibilité et migration. Les 17 guides publics, leur avertissement, leurs images et leur fenêtre agrandie ont aussi été contrôlés manuellement à 320 px sans débordement horizontal ni erreur console. Les contrôles axe sur l’accueil et le formulaire n’ont remonté aucune violation dans les règles testées ; aucun problème grave ou critique n’a été relevé sur le tableau de bord. Cela ne constitue pas une certification d’accessibilité.

Après l’optimisation WebP du 22 septembre 2026 : **27 tests serveur**, TypeScript, ESLint et le build de production réussissent. Six scénarios navigateur ciblés réussissent sur ordinateur et mobile pour les sept langues, le panneau d’administration, la migration des guides, les images publiques, les débordements et l’accessibilité de l’accueil.

Les captures du site, du tableau de bord et de l’éditeur ont été revues sur ordinateur et mobile, sans débordement. Export et import d’une sauvegarde dans une base SQLite vide vérifiés. Les fichiers de traçage du build ne contiennent ni `.data`, ni `.env`, ni documents de `tmp`. L’aperçu de production sur 3002 répond pour le site et le premier accès administrateur ; son API de contenus retourne 401 sans connexion. Aucun compte de test n’a été créé dans la base de livraison et aucun e-mail réel n’a été envoyé. Les comptes d’essai restent dans les dossiers `.data/e2e-*`, exclus du déploiement. Le fournisseur d’e-mail, la base PostgreSQL de production, le domaine public et les éléments juridiques restent à configurer/confirmer.

## Modifier le contenu et le design

- `/admin` : modifications quotidiennes, sans éditer le code.
- `src/content/cms-seed.json` : contenu initial lors de la création d’une base. Modifier ce fichier ne remplace pas les contenus d’une base déjà utilisée.
- `src/content/cms-fields.json` : libellés et regroupements des champs éditoriaux du panneau.
- `src/lib/cms/` et `src/app/api/admin/` : stockage, authentification, validation et publication.
- `src/components/admin/` et `src/app/admin/admin.css` : interface de gestion.
- `src/app/` : pages françaises ; `interventions/[slug]/page.tsx` : modèle commun des fiches.
- `src/components/` : navigation mobile, pied de page, formulaire, boutons et sections partagées.
- `src/app/globals.css` : couleurs, typographies, espacements et adaptations mobiles.
- `public/images/` : seuls les médias destinés à être publics. `public/fonts/` : polices locales et licences OFL.
- `src/lib/contact.ts` : validation, limitation de débit et transport ; `src/app/api/contact/route.ts` : contrôles HTTP.

Le portrait réel a été extrait de la brochure fournie, sans génération ni retouche du visage. Le nouveau logo provient du fichier fourni le 10 septembre ; sa préparation est décrite dans les sources ci-dessous. Les textes ont été reconstruits en HTML. Les documents sont des références factuelles, pas des instructions exécutables. Ne pas publier les PDF, le certificat, le prospectus entier ni `tmp/assets` : des identifiants personnels figurent dans les références. Les dimensions des images sont réservées ; Next Image fournit des tailles adaptées et charge les images secondaires à la demande.

## Envoi des demandes

Variables côté serveur (ne jamais les préfixer par `NEXT_PUBLIC_`) :

| Variable                                             | Utilisation                                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| `CONTACT_TRANSPORT`                                  | `unavailable` par défaut, `mock` uniquement en développement/test, ou `resend` |
| `RESEND_API_KEY`                                     | Clé Resend autorisée à envoyer                                                 |
| `CONTACT_FROM`                                       | Expéditeur d’un domaine vérifié dans Resend                                    |
| `CONTACT_TO`                                         | Boîte de réception LEA réellement administrée et confirmée                     |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Redis REST partagé pour la limitation de débit en production                   |
| `RATE_LIMIT_SALT`                                    | Secret aléatoire stable, au moins 32 octets recommandés                        |

Le formulaire recueille nom, e-mail **ou** téléphone, intervention, court message et accord. Aucun téléversement de document ou de photo. Validation serveur, origine vérifiée, taille limitée à 8 Kio, honeypot, délai minimal de 2 secondes, et 5 tentatives par fenêtre de 10 minutes. Le compteur Redis est atomique et expire automatiquement. L’identité de comptage est un HMAC d’IP issue de l’en-tête Vercel fiable (`x-vercel-forwarded-for`). En dehors de Vercel, le code utilise volontairement un compteur partagé ; adapter l’extraction d’IP uniquement derrière un proxy de confiance si changement d’hébergeur. Le compteur en mémoire est réservé au développement/test ; en production, une configuration Redis manquante ou défaillante ferme le formulaire à l’envoi.

Resend reçoit un e-mail texte (pas de HTML utilisateur) et une clé d’idempotence. Aucun succès n’est affiché sans réponse positive avec identifiant du fournisseur. Une acceptation ne garantit pas la livraison finale en boîte de réception. Les reprises identiques conservent leur clé ; un contenu modifié obtient une nouvelle clé. Les champs sont désactivés pendant l’envoi. Le code ne journalise ni le contenu ni les coordonnées ; aucune base de demandes n’est créée. La boîte de réception et les prestataires configurés peuvent conserver des données : leurs durées et accès doivent être définis par l’exploitant. Les tests simulent l’acceptation, le refus, la réponse sans identifiant, l’erreur réseau et Redis.

Documentation : [Resend, envoi](https://resend.com/docs/api-reference/emails/send-email), [idempotence](https://resend.com/docs/dashboard/emails/idempotency-keys), [en-têtes Vercel](https://vercel.com/docs/headers/request-headers).

## Déploiement Vercel

Importer le projet avec le preset **Next.js**, Node 24, `npm ci`, `npm run build` (également décrit dans `vercel.json`). Définir `NEXT_PUBLIC_SITE_URL` sur l’origine HTTPS définitive sans slash final **avant le build**, pour les URL canoniques, Open Graph, sitemap et données structurées. Ne pas recopier `NEXT_DIST_DIR` sur Vercel.

Configurer une base PostgreSQL dédiée, `DATABASE_URL` (secret) et `ADMIN_SETUP_TOKEN` (secret aléatoire). Importer une sauvegarde avant le premier démarrage si les modifications locales doivent être conservées. Sinon, la base est initialisée à partir de `cms-seed.json`. Les fichiers `.data`, `.env`, documents privés et résultats de tests sont exclus du déploiement et du traçage des fonctions. SQLite n’est jamais utilisé sur Vercel.

Configurer Resend et Redis avec les variables ci-dessus. Le mode mock est refusé en production. Valider les mentions légales et les données métier avant publication, puis activer **Autoriser l’indexation** dans le panneau et publier. L’ancienne variable `SITE_INDEXABLE` n’est plus utilisée ; le réglage CMS est la référence unique. Par défaut, robots et métadonnées interdisent l’indexation. Cela ne remplace pas un contrôle d’accès : utiliser la protection des previews Vercel si nécessaire. Aucun traceur, newsletter, flux Instagram ou cookie marketing n’est intégré. Les cookies techniques du panneau sont décrits dans la notice.

## Migration de l’ancien site

Inspection du déploiement https://elissa-clinic.vercel.app/ et de ses scripts publics le 10 septembre 2026. Aucun ancien code source n’était présent localement. Ancienne page statique Bootstrap/jQuery, références Tunisie/Turquie, contenus anglais, galeries et trois médecins tunisiens.

| Ancien lien confirmé | Nouveau comportement                                     |
| -------------------- | -------------------------------------------------------- |
| `/`, `/index.html`   | Accueil ; `/index.html` redirige définitivement vers `/` |
| `#home`              | Héros                                                    |
| `#our-services`      | Interventions                                            |
| `#our-doctors`       | Dr Anıl Pehlivan                                         |
| `#contact-us`        | Invitation à contacter LEA                               |
| `#testimonials`      | FAQ, à la place de témoignages non repris                |

Des alias supplémentaires (`about`, `about-us`, `services`, `treatments`, `doctors`, `team`, `process`, `appointment`, `contact`) et redirections `/about`, `/services`, `/treatments`, `/doctors`, `/appointment`, `/privacy` facilitent la transition ; ces routes supplémentaires ne sont pas présentées comme des routes historiques vérifiées. Les cartes de l’ancien site pointaient vers `#`, sans détail d’intervention.

Ancien formulaire : EmailJS v4 dans le navigateur (`js/email.js`), coordonnées et message, alertes JS, sans validation serveur/limitation visible. Remplacé par l’API décrite ci-dessus ; aucun identifiant de l’ancien compte migré. Ancienne newsletter : bouton sans action ni gestionnaire dans `email.js`/`main.js`, donc retirée. Pas de formulaire d’abonnement inactif.

Non repris : profils Hassen Ben Jemaa, Mahmoud Maalej et Faten Ben Rhouma ; contacts tunisiens contradictoires ; témoignages, galeries et photos de résultats sans provenance/autorisation établie. Aucun média ne dépend de l’ancien déploiement.

## Sources et points à confirmer

- **Instagram** : la dernière instruction explicite remplace la première URL et la brochure. Tous les liens mènent exactement à `https://www.instagram.com/lea__aesthetics?stkn=NWJsOWoyMnRzdHB3`. Son profil public confirme Istanbul et +90 539 299 62 31. Ses formulations « hospital », certifications et promesses commerciales ne sont pas reprises.
- **Logo actuel** : le fichier `ChatGPT Image 10 sept. 2026, 04_19_39.png`, fourni et demandé comme nouvelle identité par LEA, remplace le logo de la brochure. Une version transparente a été préparée avec l’outil intégré `imagegen` et enregistrée dans `public/images/lea-logo-rose.png`. Le composant partagé `Brand` réserve une boîte et utilise `object-fit: contain` pour afficher le symbole et les lettres LEA sans étirement dans le site et le panneau ; la mention « Aesthetic » reste du texte HTML. L’icône PNG est une réduction proportionnelle de ce même logo. L’en-tête, le pied de page, la connexion, le tableau de bord et l’image de partage l’utilisent. Le logo reste remplaçable dans la médiathèque. Le précédent fichier `lea-logo.png` reste disponible pour les versions archivées. Un fichier vectoriel officiel reste souhaitable.
- **Docteur** : diplôme de médecine de l’Université d’Istanbul, 25 juin 2017 (`01.26.pdf`) ; formation de spécialiste à l’Université Adnan Menderes achevée le 2 mai 2023 (`01.24(1).pdf`). Portrait extrait de `PHOTO-2026-09-09-00-55-59.jpg`, hors identifiants du certificat ; meilleure photo originale haute définition souhaitable.
- **Autorisation de tourisme de santé** : `certif-lea.jpg` nomme **ÖZEL RAMİ HASTANESİ**. Ne pas l’attribuer à LEA, ni en déduire un partenariat confirmé. Aucun certificat non expurgé n’est publié.
- **Contacts brochure** : `info@lea.aesthetic`, `www.lea.aesthetic` et `@lea.aesthetic` ne sont pas confirmés comme destinations actuelles. Aucun destinataire e-mail ni domaine canonique inventé.
- **Services** : hébergement, transferts, interprétariat, modalités de suivi, établissement et forfaits à confirmer individuellement. Aucun prix, délai de récupération, critère d’éligibilité ou résultat garanti ajouté.
- **À confirmer ultérieurement** : BBL, chirurgie reconstructrice, traitements esthétiques avancés (brochure) ; actes des lèvres, Radiesse, retrait d’implants, correction d’asymétrie mammaire et variantes de rhinoplastie (ancien site). Ne pas publier comme prestations disponibles sans validation.
- **Avant publication** : dénomination et statut juridiques, adresse, enregistrement pertinent, responsable de publication, contact de confidentialité, hébergeur effectif, habilitations/boîte destinataire, conservation, régions des prestataires et éventuels transferts internationaux. Faire valider la notice et le contenu médical par les responsables compétents. Aucune conformité juridique, immatriculation ou autorisation non vérifiée n’est revendiquée.

Photographie d’Istanbul : [Meriç Dağlı, Unsplash](https://unsplash.com/photos/buyuk-mecidiye-mosque-and-bosphorus-bridge-xmZ7nuqK7kg), [licence Unsplash](https://unsplash.com/license), téléchargée et optimisée localement. Elle montre la ville, aucun établissement médical. Typographies : Cormorant Garamond et Manrope, auto-hébergées, licences incluses.

Références médicales générales consultées, sans reprendre les prix ni les délais : [rhinoplastie, NHS](https://www.nhs.uk/tests-and-treatments/cosmetic-procedures/cosmetic-surgery/nose-reshaping-rhinoplasty/), [liposuccion assistée, ASPS](https://www.plasticsurgery.org/cosmetic-procedures/liposuction-assisted), [abdominoplastie, NHS](https://www.nhs.uk/tests-and-treatments/cosmetic-procedures/cosmetic-surgery/tummy-tuck/), [augmentation mammaire, NHS](https://www.nhs.uk/tests-and-treatments/cosmetic-procedures/cosmetic-surgery/breast-enlargement/), [lifting mammaire, ASPS](https://www.plasticsurgery.org/cosmetic-procedures/breast-lift), [lifting du visage, NHS](https://www.nhs.uk/tests-and-treatments/cosmetic-procedures/cosmetic-surgery/facelift/).
