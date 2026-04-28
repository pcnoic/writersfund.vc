#!/usr/bin/env bash
# Generate production secrets for PostgreSQL and JWT

set -euo pipefail

echo "🔐 Generating Production Secrets"
echo "================================"
echo ""

# Generate strong random passwords
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')
JWT_SECRET=$(openssl rand -base64 32 | tr -d '\n')

echo "📝 Update the following in your production environment:"
echo ""
echo "1. Add to k8s/base/kustomization.yaml (replace existing secretGenerator):"
echo "   secretGenerator:"
echo "     - name: postgres-secret"
echo "       literals:"
echo "         - password=${POSTGRES_PASSWORD}"
echo ""
echo "2. Add to your .env.production (or configure in your secret manager):"
echo "   DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/writersfund"
echo "   JWT_SECRET=${JWT_SECRET}"
echo ""
echo "3. Create the app secret:"
echo "   kubectl create secret generic wf-app-env \\"
echo "     --from-literal=DATABASE_URL='postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/writersfund' \\"
echo "     --from-literal=JWT_SECRET='${JWT_SECRET}' \\"
echo "     --namespace writersfund \\"
echo "     --dry-run=client -o yaml | kubectl apply -f -"
echo ""
echo "⚠️  KEEP THESE SECRETS SAFE!"
echo ""
