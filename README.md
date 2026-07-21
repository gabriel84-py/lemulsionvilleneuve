# ✦ L'Émulsion — Site web & administration

Site vitrine éditorial et **100 % responsive** pour **L'Émulsion**
(1 rue de l'Hôpital, 30400 Villeneuve-lès-Avignon), bistronomie française
du chef **Damien Chocano**, avec une interface d'administration complète
qui permet au chef de tout modifier lui-même (carte, prix, photos, horaires,
avis, textes…).

- **Backend** : Node.js + Express + EJS · **Base** : SQLite (`better-sqlite3`)
- **Auth** : session cookie httpOnly + bcrypt (12 rounds) + CSRF + rate-limit
- **Frontend** : HTML/CSS/JS natif (aucune étape de build)
- **Sécurité** : Helmet + CSP stricte + `sameSite: strict` + HSTS en prod
- **i18n** : FR / EN / IT sur tout le site public

---

## 🚀 Démarrage en local (1 minute)

```bash
npm install

# 1. Copier la config et générer un secret de session
cp .env.example .env
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))" >> .env

# 2. Initialiser la base + les données
npm run seed

# 3. Lancer
npm run dev        # rechargement auto (dev)
# ou
npm start          # mode prod
```

- Site public : **http://localhost:5678**
- Administration : **http://localhost:5678/admin/login**

**Identifiants par défaut** → identifiant `admin` · mot de passe `change_this_password_immediately` (`ADMIN_PASSWORD` dans `.env`).
> ⚠️ Change-le immédiatement sur `/admin/account`, ou : `npm run create-admin`.

---

## 🧰 Scripts disponibles

| Commande | Effet |
|----------|-------|
| `npm start` | Lance le serveur (mode prod) |
| `npm run dev` | Serveur avec rechargement auto (nodemon) |
| `npm run seed` | Initialise la base : settings, horaires, menu, avis (idempotent) |
| `npm run refresh-menu` | Rafraîchit la carte depuis `scripts/menu-data.js` |
| `npm run import-gallery` | Importe toutes les images d'un dossier dans la galerie (WebP auto). Options : `-- --reset` (vider avant), `-- --dir=/chemin` |
| `npm run import-images` | Import batch des photos de plats (association aux items du menu) |
| `npm run backup` | Sauvegarde `data/lemulsion.db` + `public/uploads/` dans `backups/lemulsion-<date>.tar.gz` |
| `npm run create-admin` | CLI pour ajouter/réinitialiser un compte admin |

---

## 🌍 Déploiement sur ton VPS (pas à pas)

Guide pour un **VPS Ubuntu/Debian déjà multi-sites** avec **PM2** et **nginx** en HTTPS.
L'app tourne sur **`127.0.0.1:5678`** (jamais exposé directement), nginx fait le reverse proxy depuis le domaine.
Remplace `VOTRE-DOMAINE.fr` partout par le vrai domaine (ex : `lemulsion-villeneuve.fr`).

### 1. Pointer le domaine vers le VPS
Chez le registrar/DNS : enregistrement **A** (et `www`) → IP du VPS. Propagation ~10 min.

### 2. Prérequis (si pas déjà là — sinon skip)
```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential git nginx

# PM2 (une fois pour toutes les apps du VPS)
sudo npm install -g pm2
```

### 3. Récupérer le projet
```bash
cd /var/www
git clone <URL_DU_DEPOT> lemulsion       # ou : scp/rsync depuis ta machine
cd lemulsion
npm ci --omit=dev
```

### 4. Configurer l'environnement
```bash
cp .env.example .env
nano .env
```
Remplis **au minimum** :
```ini
NODE_ENV=production
PORT=5678
SESSION_SECRET=colle-ici-le-resultat-de:  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
COOKIE_SECURE=true
ADMIN_USERNAME=admin
ADMIN_PASSWORD=un_mot_de_passe_solide
PUBLIC_URL=https://VOTRE-DOMAINE.fr
```

Puis seed la base :
```bash
npm run seed
```

### 5. Lancer avec PM2
```bash
pm2 start ecosystem.config.cjs
pm2 save                 # mémorise l'app pour le prochain reboot
pm2 startup              # affiche une commande sudo à coller → relance auto
```
Vérifie : `pm2 status` (tu dois voir `lemulsion` `online`) et `pm2 logs lemulsion`.

### 6. Configurer nginx (reverse proxy)
```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/lemulsion
sudo nano /etc/nginx/sites-available/lemulsion   # remplace VOTRE-DOMAINE.fr partout
sudo ln -s /etc/nginx/sites-available/lemulsion /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```
À ce stade le site répond en **http://VOTRE-DOMAINE.fr**.

> 💡 Le port **5678** est choisi pour éviter les conflits sur un VPS multi-sites (3000, 8080, 8000 sont souvent déjà pris). Si tu veux un autre port, change `PORT=` dans `.env` **et** `proxy_pass http://127.0.0.1:XXXX;` dans le fichier nginx.

### 7. Activer le HTTPS (gratuit, Let's Encrypt)
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d VOTRE-DOMAINE.fr -d www.VOTRE-DOMAINE.fr
```
Certbot ajoute le certificat, la redirection HTTP → HTTPS et gère le renouvellement automatique (cron).
🎉 Site en ligne en **https://VOTRE-DOMAINE.fr**.

### 8. (Recommandé) Pare-feu — à faire une fois pour tout le VPS
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## 🔄 Mettre à jour le site (après modifications)

Une seule commande sur le VPS :
```bash
./deploy/deploy.sh
```
Elle enchaîne : `git pull` → `npm ci --omit=dev` → **sauvegarde de la base** → `pm2 reload lemulsion` (zéro downtime).

---

## 💾 Sauvegardes & restauration

```bash
npm run backup                    # crée backups/lemulsion-<date>.tar.gz (DB + uploads)
```

**Sauvegarde automatique quotidienne** (cron) — à faire une fois :
```bash
crontab -e
# ajoute :
0 4 * * * cd /var/www/lemulsion && /usr/bin/npm run backup >/dev/null 2>&1
0 5 * * * find /var/www/lemulsion/backups -name "*.tar.gz" -mtime +14 -delete
```
> Les données à conserver : **`data/lemulsion.db`** (contenu du site : menu, horaires, avis, réglages) et **`public/uploads/`** (photos téléversées). Le `.tar.gz` créé par `npm run backup` contient les deux.

**Restauration** :
```bash
pm2 stop lemulsion
tar -xzf backups/lemulsion-2026-07-21T04-00.tar.gz -C /tmp/restore
cp /tmp/restore/lemulsion.db data/
cp -r /tmp/restore/uploads/* public/uploads/
pm2 start lemulsion
```

---

## 🖼️ Alimenter la galerie photos

3 façons, selon la situation.

### 1. Via l'admin (usage normal)
`/admin/gallery` → **glisser-déposer** un lot d'images (JPG/PNG/WebP/HEIC, max 8 Mo chacune).
Les images sont converties en WebP automatiquement, réordonnables en drag & drop.

### 2. Batch depuis un dossier (avant contrat client, migration…)
```bash
# Place tes JPG dans public/uploads/gallery-tmp/
npm run import-gallery              # ajoute aux existantes
npm run import-gallery -- --reset   # repart de zéro (supprime les anciennes)
```
Le script convertit tout en WebP optimisé (1600 px max, qualité 82) et insère dans la table `gallery` avec des captions FR/EN/IT auto (détectées par mots-clés : *cheesecake, tiramisu, terrasse, interior…*).

### 3. Depuis un autre dossier
```bash
npm run import-gallery -- --dir=/chemin/vers/photos --reset
```

---

## ✅ Checklist de production

- [ ] `NODE_ENV=production` dans `.env`
- [ ] `SESSION_SECRET` défini (32+ caractères, généré via `crypto.randomBytes`)
- [ ] `COOKIE_SECURE=true` dans `.env`
- [ ] `PUBLIC_URL=https://…` renseigné (utilisé pour og:image, JSON-LD)
- [ ] Mot de passe admin changé sur `/admin/account`
- [ ] HTTPS actif (certbot)
- [ ] `pm2 save` + `pm2 startup` (redémarrage auto au reboot)
- [ ] Pare-feu (ufw) activé
- [ ] Sauvegarde automatique configurée (cron)
- [ ] Bandeau d'annonce vérifié dans `/admin/settings` (activable au besoin : jours fériés, congés…)

---

## 🗂️ Structure

```
lemulsion/
├── src/
│   ├── server.js              # Express + sécurité (Helmet, CSP, sessions, CSRF)
│   ├── db/database.js         # Schema SQLite
│   ├── middleware/            # auth, i18n, upload (sharp), csrf
│   ├── routes/                # public, admin-auth, admin
│   └── utils/                 # settings, hours, logger
├── views/
│   ├── layouts/               # public.ejs, admin.ejs
│   ├── partials/              # header, footer, drawer, bottombar…
│   ├── public/                # home, menu, gallery, reviews, contact, legal, 404
│   └── admin/                 # dashboard, settings, hours, menu, gallery, reviews, logs, account
├── public/
│   ├── css/                   # public.css, admin.css
│   ├── js/                    # public.js, admin.js
│   ├── images/                # logo.jpg, hero-artwork.svg, signature.svg, ornament.svg
│   └── uploads/               # images téléversées (WebP auto)
├── locales/                   # fr.json, en.json, it.json
├── scripts/
│   ├── seed.js                # Init des données
│   ├── menu-data.js           # Source de vérité de la carte initiale
│   ├── import-gallery.js      # Import batch d'images dans la galerie
│   ├── refresh-menu.js        # Rafraîchit la carte depuis menu-data.js
│   ├── import-images.js       # Import batch photos de plats
│   ├── backup.js              # Sauvegarde .tar.gz
│   └── create-admin.js        # CLI compte admin
├── deploy/
│   ├── nginx.conf.example     # Modèle reverse proxy nginx (port 5678)
│   └── deploy.sh              # Mise à jour en une commande
├── ecosystem.config.cjs       # Configuration PM2
├── .env.example               # Modèle de configuration
├── data/lemulsion.db          # Base SQLite (créée au 1er seed)
├── logs/                      # Logs PM2 (out + err)
└── backups/                   # Sauvegardes .tar.gz
```

---

## 🔒 Sécurité — les grandes lignes

- **CSP stricte** (Helmet) : pas d'inline scripts, pas de sources externes tierces autres que Google Fonts + iframe Google Maps
- **Sessions SQLite** (pas en mémoire) : survivent aux reload PM2
- **Cookies** `httpOnly + sameSite=strict + secure` en prod
- **Login** : rate-limit 8 tentatives / 15 min par IP, bcrypt timing-safe (comparaison même si user inconnu)
- **CSRF** : token par session sur tous les formulaires admin
- **Uploads** : limités à 8 Mo, MIME vérifié, redimensionnés + convertis en WebP par sharp
- **Logs admin** : toute action est tracée (qui, quoi, quand, IP) → `/admin/logs`
- **HSTS** en prod (1 an, includeSubDomains, preload-ready)

---

## 📝 Modifier le contenu (usage quotidien)

Tout est éditable via l'admin, aucun redéploiement nécessaire :

| Où | Quoi |
|----|------|
| `/admin/settings` | Nom, adresse, téléphone, email, hero, à propos, bandeau d'annonce, réseaux sociaux, SEO — en FR/EN/IT |
| `/admin/menu` | Catégories (formules, entrées, plats, desserts, vins), plats, prix, photos, signature, végé |
| `/admin/hours` | Créneaux midi/soir par jour |
| `/admin/gallery` | Import multiple, drag & drop pour réordonner, captions FR/EN/IT |
| `/admin/reviews` | Verbatims libres, sources, notes |
| `/admin/logs` | Historique complet des modifications |
| `/admin/account` | Changer son mot de passe |

---

## 📜 Licence

Site sur mesure. Tous droits réservés au restaurant L'Émulsion.
