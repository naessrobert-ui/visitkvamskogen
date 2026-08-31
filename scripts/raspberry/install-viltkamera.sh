#!/usr/bin/env bash

set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Kjør installasjonen med sudo." >&2
  exit 1
fi

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "${SCRIPT_DIR}/../.." && pwd)"
INSTALL_ROOT="/opt/visitkvamskogen"
CONFIG_ROOT="/etc/visitkvamskogen"
ENV_FILE="${CONFIG_ROOT}/viltkamera.env"
SERVICE_USER="visitkvamskogen"

if ! getent group "${SERVICE_USER}" >/dev/null 2>&1; then
  groupadd --system "${SERVICE_USER}"
fi

if ! id "${SERVICE_USER}" >/dev/null 2>&1; then
  useradd --system --gid "${SERVICE_USER}" --home-dir /var/lib/visitkvamskogen --create-home --shell /usr/sbin/nologin "${SERVICE_USER}"
fi

install -d -o root -g root -m 0755 "${INSTALL_ROOT}/scripts/raspberry"
install -d -o root -g root -m 0700 "${CONFIG_ROOT}"
install -o root -g root -m 0755 "${REPO_ROOT}/scripts/hent-viltkamerabilder.py" "${INSTALL_ROOT}/scripts/hent-viltkamerabilder.py"
install -o root -g root -m 0755 "${SCRIPT_DIR}/kjor-viltkamera.py" "${INSTALL_ROOT}/scripts/raspberry/kjor-viltkamera.py"
install -o root -g root -m 0644 "${SCRIPT_DIR}/systemd/hent-viltkamerabilder.service" "/etc/systemd/system/hent-viltkamerabilder.service"
install -o root -g root -m 0644 "${SCRIPT_DIR}/systemd/hent-viltkamerabilder.timer" "/etc/systemd/system/hent-viltkamerabilder.timer"

if [[ ! -f "${ENV_FILE}" ]]; then
  install -o root -g root -m 0600 "${SCRIPT_DIR}/viltkamera.env.example" "${ENV_FILE}"
  echo "Opprettet ${ENV_FILE}. Fyll inn nøklene før timeren aktiveres."
else
  chmod 0600 "${ENV_FILE}"
  chown root:root "${ENV_FILE}"
  echo "Beholdt eksisterende ${ENV_FILE}."
fi

systemctl daemon-reload

if [[ "${1:-}" == "--enable" ]]; then
  required=(GMAIL_ADDRESS GMAIL_APP_PASSWORD SUPABASE_URL)
  for name in "${required[@]}"; do
    if ! grep -Eq "^${name}=[^[:space:]].*$" "${ENV_FILE}"; then
      echo "${name} mangler i ${ENV_FILE}." >&2
      exit 1
    fi
  done
  if ! grep -Eq '^SUPABASE_(SECRET_KEY|SERVICE_ROLE_KEY)=[^[:space:]].*$' "${ENV_FILE}"; then
    echo "SUPABASE_SECRET_KEY eller SUPABASE_SERVICE_ROLE_KEY mangler i ${ENV_FILE}." >&2
    exit 1
  fi
  systemctl enable --now hent-viltkamerabilder.timer
  echo "Timeren er aktivert."
else
  echo "Installerte program og systemd-filer uten å aktivere timeren."
  echo "Kjør på nytt med --enable etter at miljøfilen er fylt ut."
fi
