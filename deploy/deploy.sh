#!/usr/bin/env bash
#
# L'Émulsion — Mise à jour du site en production, en une commande.
#
# Fait : git pull → npm install --omit=dev → backup DB → pm2 reload lemulsion.
#
# Usage : ./deploy/deploy.sh
#

set -euo pipefail

# Va à la racine du projet (parent du dossier deploy/)
cd "$(dirname "$0")/.."

APP_NAME="lemulsion"

echo ""
echo "✦ L'Émulsion — deploy"
echo ""

echo "▸ 1/4 · git pull"
git pull --ff-only

echo ""
echo "▸ 2/4 · npm install (prod)"
npm ci --omit=dev

echo ""
echo "▸ 3/4 · Sauvegarde de la base"
if npm run backup >/dev/null 2>&1; then
  echo "  ✓ Backup créé"
else
  echo "  ⚠ Backup échoué (à vérifier — on continue)"
fi

echo ""
echo "▸ 4/4 · Reload PM2"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 reload "$APP_NAME"
  echo "  ✓ $APP_NAME rechargé sans downtime"
else
  echo "  ⚠ Process $APP_NAME inconnu de PM2 — premier lancement :"
  pm2 start ecosystem.config.cjs
  pm2 save
fi

echo ""
echo "✓ Déploiement terminé."
echo "  Logs : pm2 logs $APP_NAME"
echo ""
