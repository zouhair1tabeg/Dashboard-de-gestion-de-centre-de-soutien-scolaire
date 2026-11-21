#!/bin/bash
# Script de sauvegarde automatique de la base PostgreSQL
# Usage: ./backup_db.sh
# Assurez-vous d'avoir pg_dump installé et les variables d'environnement configurées

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="$BACKUP_DIR/prime_db_$TIMESTAMP.sql"

# Créer le répertoire si inexistant
mkdir -p "$BACKUP_DIR"

# dump de la base (utiliser les variables d'environnement si besoin)
# PGPASSWORD=votre_mot_de_passe pg_dump -h localhost -U votre_user prime_db > "$FILENAME"

# Pour environnement Docker:
# docker exec -t container_postgres pg_dump -U username database_name > "$FILENAME"

echo "Sauvegarde effectuée : $FILENAME"
