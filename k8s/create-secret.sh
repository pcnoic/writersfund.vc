#!/usr/bin/env bash
# One-time command: parse .env and create (or replace) the app secret in Kubernetes.
# Usage: ./k8s/create-secret.sh [path/to/.env]
set -euo pipefail

ENV_FILE="${1:-.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: env file '$ENV_FILE' not found." >&2
  exit 1
fi

# Build --from-literal args from non-empty, non-comment lines
LITERALS=()
while IFS= read -r line; do
  # Skip blank lines and comments
  [[ -z "$line" || "$line" == \#* ]] && continue
  LITERALS+=("--from-literal=${line}")
done < "$ENV_FILE"

kubectl create secret generic wf-app-env \
  --namespace writersfund \
  --save-config \
  --dry-run=client \
  "${LITERALS[@]}" \
  -o yaml | kubectl apply -f -

echo "Secret wf-app-env applied to namespace writersfund."
