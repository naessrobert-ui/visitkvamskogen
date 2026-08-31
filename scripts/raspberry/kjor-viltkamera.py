#!/usr/bin/env python3

import importlib.util
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen


CORE_PATH = Path(__file__).resolve().parents[1] / "hent-viltkamerabilder.py"
DEFAULT_STATE_PATH = Path("/var/lib/visitkvamskogen/imap-state.json")


def load_core():
    spec = importlib.util.spec_from_file_location("hent_viltkamerabilder", CORE_PATH)
    if not spec or not spec.loader:
        raise RuntimeError(f"Kunne ikke laste bildehenteren fra {CORE_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


CORE = load_core()


def optional_env(name):
    return os.environ.get(name, "").strip()


def positive_int_env(name, default):
    value = optional_env(name)
    if not value:
        return default
    try:
        parsed = int(value)
    except ValueError as error:
        raise RuntimeError(f"{name} må være et heltall") from error
    if parsed < 1 or parsed > 365:
        raise RuntimeError(f"{name} må være mellom 1 og 365")
    return parsed


def supabase_headers(key):
    headers = {"apikey": key}
    if not key.startswith("sb_secret_"):
        headers["Authorization"] = f"Bearer {key}"
    return headers


class Supabase(CORE.Supabase):
    def request(self, method, path, body=None, content_type="application/json", prefer=None):
        headers = supabase_headers(self.key)
        if body is not None:
            headers["Content-Type"] = content_type
        if prefer:
            headers["Prefer"] = prefer
        request = Request(f"{self.url}{path}", data=body, headers=headers, method=method)
        try:
            with urlopen(request, timeout=45) as response:
                payload = response.read()
                return json.loads(payload) if payload else None
        except HTTPError as error:
            details = error.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Supabase svarte {error.code}: {details}") from error


def supabase_key():
    key = optional_env("SUPABASE_SECRET_KEY") or optional_env("SUPABASE_SERVICE_ROLE_KEY")
    if not key:
        raise RuntimeError("Mangler SUPABASE_SECRET_KEY eller SUPABASE_SERVICE_ROLE_KEY")
    return key


def load_state(path):
    try:
        state = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError(f"Kunne ikke lese IMAP-status fra {path}: {error}") from error

    uidvalidity = state.get("uidvalidity")
    last_uid = state.get("last_uid")
    if not isinstance(uidvalidity, str) or not uidvalidity:
        raise RuntimeError(f"Ugyldig uidvalidity i {path}")
    if not isinstance(last_uid, int) or last_uid < 0:
        raise RuntimeError(f"Ugyldig last_uid i {path}")
    return {"uidvalidity": uidvalidity, "last_uid": last_uid}


def save_state(path, uidvalidity, last_uid):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = path.with_name(f".{path.name}.tmp")
    temporary_path.write_text(
        json.dumps({"uidvalidity": uidvalidity, "last_uid": last_uid}) + "\n",
        encoding="utf-8",
    )
    os.chmod(temporary_path, 0o600)
    os.replace(temporary_path, path)


def mailbox_value(mailbox, name):
    _, values = mailbox.response(name)
    if not values or values[0] is None:
        raise RuntimeError(f"Gmail oppga ikke {name}")
    value = values[0]
    return value.decode("ascii") if isinstance(value, bytes) else str(value)


def search_uids(mailbox, state, uidvalidity, lookback_days):
    if state and state["uidvalidity"] == uidvalidity:
        minimum_uid = state["last_uid"] + 1
        status, data = mailbox.uid("search", None, "UID", f"{minimum_uid}:*")
        incremental = True
    else:
        since = (datetime.now(timezone.utc) - timedelta(days=lookback_days)).strftime("%d-%b-%Y")
        status, data = mailbox.uid("search", None, "SINCE", since)
        minimum_uid = 0
        incremental = False

    if status != "OK":
        raise RuntimeError("Gmail-søket mislyktes")

    raw_uids = data[0].split() if data and data[0] else []
    uids = [uid for uid in raw_uids if int(uid) >= minimum_uid]
    return uids, incremental


def raw_message_for_uid(mailbox, uid):
    status, fetched = mailbox.uid("fetch", uid, "(RFC822)")
    if status != "OK" or not fetched:
        raise RuntimeError(f"Kunne ikke hente Gmail-melding med UID {uid.decode('ascii')}")
    for item in fetched:
        if isinstance(item, tuple) and len(item) > 1:
            return item[1]
    raise RuntimeError(f"Gmail-melding med UID {uid.decode('ascii')} manglet innhold")


def process_result(result):
    if isinstance(result, tuple):
        return result
    return result, 0


def main():
    gmail_address = CORE.required_env("GMAIL_ADDRESS")
    gmail_app_password = CORE.required_env("GMAIL_APP_PASSWORD").replace(" ", "")
    supabase = Supabase(CORE.required_env("SUPABASE_URL"), supabase_key())
    state_path = Path(optional_env("IMAP_STATE_FILE") or DEFAULT_STATE_PATH)
    state = load_state(state_path)
    lookback_days = positive_int_env("GMAIL_INITIAL_LOOKBACK_DAYS", 30)
    reclassify_since = (
        CORE.optional_datetime_env("WILDLIFE_RECLASSIFY_SINCE")
        if hasattr(CORE, "optional_datetime_env")
        else None
    )
    total_uploaded = 0
    total_reclassified = 0

    with CORE.imaplib.IMAP4_SSL("imap.gmail.com", 993) as mailbox:
        mailbox.login(gmail_address, gmail_app_password)
        status, _ = mailbox.select("INBOX", readonly=True)
        if status != "OK":
            raise RuntimeError("Kunne ikke åpne Gmail-innboksen")

        uidvalidity = mailbox_value(mailbox, "UIDVALIDITY")
        uidnext = int(mailbox_value(mailbox, "UIDNEXT"))
        uids, incremental = search_uids(mailbox, state, uidvalidity, lookback_days)

        for uid in uids:
            kwargs = {"reclassify_since": reclassify_since} if reclassify_since else {}
            result = CORE.process_message(supabase, raw_message_for_uid(mailbox, uid), **kwargs)
            uploaded, reclassified = process_result(result)
            total_uploaded += uploaded
            total_reclassified += reclassified
            save_state(state_path, uidvalidity, int(uid))

        if not incremental and (not uids or int(uids[-1]) < uidnext - 1):
            save_state(state_path, uidvalidity, uidnext - 1)

    print(
        f"Behandlet {len(uids)} nye e-poster. "
        f"Lastet opp {total_uploaded} bilder. "
        f"Knyttet {total_reclassified} eksisterende bilder til riktig kamera."
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"FEIL: {error}", file=sys.stderr)
        raise
