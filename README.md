# Déploiement du Centre de Soutien Scolaire (Prime) sur VPS

Ce guide détaille les étapes pour déployer l'application sur un serveur VPS (Ubuntu / Debian) en production avec **Docker Compose**, **PostgreSQL** et **Nginx** (avec HTTPS via Certbot).

---

## 1. Prérequis sur le VPS

- Un serveur VPS (ex: DigitalOcean, Hetzner, AWS) avec Ubuntu 22.04+
- Docker et Docker Compose installés
- Un nom de domaine pointant vers l'IP de votre VPS (ex: `gestion.centre-prime.ma`)

---

## 2. Configuration du projet sur le serveur

1. Clonez ou transférez le projet dans `/opt/prime` :
   ```bash
   git clone https://github.com/votre-compte/prime.git /opt/prime
   cd /opt/prime
   ```

2. Créez un fichier `.env` de production basé sur `.env.example` :
   ```env
   NODE_ENV=production
   PORT=3000
   DATABASE_URL="postgresql://prime_user:SECURE_PASSWORD@postgres:5432/prime_db?schema=public"
   AUTH_SECRET="générez_une_clé_secrète_très_forte_ici"
   AUTH_URL="https://gestion.centre-prime.ma"
   ```

---

## 3. Fichier Docker Compose (`docker-compose.yml`)

Créez un fichier `docker-compose.yml` à la racine :

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: prime_postgres
    restart: always
    environment:
      POSTGRES_USER: prime_user
      POSTGRES_PASSWORD: SECURE_PASSWORD
      POSTGRES_DB: prime_db
    volumes:
      :/var/lib/postgresql/data
    ports:
      - "5432:5432"

  app:
    build: .
    container_name: prime_app
    restart: always
    environment:
      - DATABASE_URL=postgresql://prime_user:SECURE_PASSWORD@postgres:5432/prime_db?schema=public
      - AUTH_SECRET=générez_une_clé_secrète_très_forte_ici
      - AUTH_URL=https://gestion.centre-prime.ma
    ports:
      - "3000:3000"
    depends_on:
      - postgres
```

---

## 4. Lancement de l'application

1. Lancez les conteneurs en arrière-plan :
   ```bash
   docker compose up -d --build
   ```

2. Exécutez les migrations Prisma et le seed (si nécessaire) :
   ```bash
   docker exec -it prime_app npx prisma migrate deploy
   docker exec -it prime_app npx prisma db seed
   ```

---

## 5. Configuration de Nginx & SSL (Let's Encrypt)

1. Installez Nginx et Certbot :
   ```bash
   sudo apt update
   sudo apt install nginx certbot python3-certbot-nginx -y
   ```

2. Créez un fichier de configuration Nginx `/etc/nginx/sites-available/prime` :
   ```nginx
   server {
       server_name gestion.centre-prime.ma;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. Activez le site :
   ```bash
   sudo ln -s /etc/nginx/sites-available/prime /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

4. Obtenez un certificat SSL gratuit :
   ```bash
   sudo certbot --nginx -d gestion.centre-prime.ma
   ```

---

## 6. Sauvegarde automatique (Backup)

Pour automatiser la sauvegarde de la base de données PostgreSQL chaque nuit :

1. Rendez le script de backup exécutable :
   ```bash
   chmod +x scripts/backup_db.sh
   ```

2. Ajoutez une tâche cron (`crontab -e`) :
   ```cron
   0 3 * * * /opt/prime/scripts/backup_db.sh >> /var/log/prime_backup.log 2>&1
   ```
