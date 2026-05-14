#!/bin/bash
# deploy.sh — Script de déploiement ATB-DigiPack
set -e

echo '====================================='
echo '   ATB-DigiPack — Déploiement'
echo '====================================='

# Vérifier que .env existe
if [ ! -f .env ]; then
    echo 'ERREUR: Fichier .env manquant!'
    echo 'Copier .env.example en .env et remplir les valeurs'
    exit 1
fi

# Arrêter les conteneurs existants
echo '[1/4] Arrêt des conteneurs existants...'
docker compose down

# Reconstruire les images
echo '[2/4] Construction des images Docker...'
docker compose build --no-cache

# Démarrer tous les services
echo '[3/4] Démarrage des services...'
docker compose up -d

# Afficher le statut
echo '[4/4] Statut des services :'
docker compose ps

echo ''
echo 'Déploiement terminé!'
echo 'Backend API    : http://localhost:3000'
echo 'Admin Dashboard: http://localhost:80'
echo 'OCR Service    : http://localhost:8000'
