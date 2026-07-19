#!/usr/bin/env python3

import email
import hashlib
import imaplib
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from email.header import decode_header
from email.utils import parsedate_to_datetime
from urllib.error import HTTPError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen


IMAGE_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}
MAX_IMAGE_BYTES = 15 * 1024 * 1024
CAMERA_PATTERN = re.compile(r"VILTKAMERA\s*:\s*([a-z0-9_-]+)", re.IGNORECASE)


def required_env(name):
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Mangler miljovariabelen {name}")
    return value


def decode_text(value):
    if not value:
        return ""
    parts = []
    for content, charset in decode_header(value):
        if isinstance(content, bytes):
            parts.append(content.decode(charset or "utf-8", errors="replace"))
        else:
            parts.append(content)
    return "".join(parts)


def camera_id_from_subject(subject):
    match = CAMERA_PATTERN.search(subject)
    camera_id = match.group(1).lower() if match else "kamera-01"
    return re.sub(r"[^a-z0-9_-]", "-", camera_id).strip("-") or "kamera-01"


class Supabase:
    def __init__(self, url, service_role_key):
        self.url = url.rstrip("/")
        self.key = service_role_key

    def request(self, method, path, body=None, content_type="application/json", prefer=None):
        headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
        }
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

    def already_processed(self, message_id, attachment_index):
        params = urlencode({
            "gmail_message_id": f"eq.{message_id}",
            "attachment_index": f"eq.{attachment_index}",
            "select": "id",
            "limit": "1",
        })
        rows = self.request("GET", f"/rest/v1/wildlife_camera_images?{params}")
        return bool(rows)

    def upload(self, path, content, mime_type):
        encoded_path = "/".join(quote(part, safe="") for part in path.split("/"))
        self.request(
            "POST",
            f"/storage/v1/object/wildlife-camera-images/{encoded_path}",
            body=content,
            content_type=mime_type,
        )

    def remove_upload(self, path):
        encoded_path = "/".join(quote(part, safe="") for part in path.split("/"))
        self.request("DELETE", f"/storage/v1/object/wildlife-camera-images/{encoded_path}")

    def insert_metadata(self, metadata):
        self.request(
            "POST",
            "/rest/v1/wildlife_camera_images",
            body=json.dumps(metadata).encode("utf-8"),
            prefer="return=minimal",
        )


def message_datetime(message):
    try:
        value = parsedate_to_datetime(message.get("Date"))
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    except (TypeError, ValueError, OverflowError):
        return datetime.now(timezone.utc)


def image_parts(message):
    for part in message.walk():
        if part.is_multipart():
            continue
        mime_type = part.get_content_type().lower()
        if mime_type not in IMAGE_TYPES:
            continue
        content = part.get_payload(decode=True) or b""
        if not content or len(content) > MAX_IMAGE_BYTES:
            continue
        yield part, content, mime_type


def process_message(supabase, raw_message):
    message = email.message_from_bytes(raw_message)
    subject = decode_text(message.get("Subject"))
    camera_id = camera_id_from_subject(subject)
    received_at = message_datetime(message)
    header_id = (message.get("Message-ID") or "").strip(" <>\t\r\n")
    message_id = header_id or hashlib.sha256(raw_message).hexdigest()
    uploaded = 0

    for attachment_index, (part, content, mime_type) in enumerate(image_parts(message)):
        if supabase.already_processed(message_id, attachment_index):
            continue

        digest = hashlib.sha256(content).hexdigest()
        extension = IMAGE_TYPES[mime_type]
        timestamp = received_at.strftime("%Y%m%dT%H%M%SZ")
        image_path = f"{camera_id}/{received_at:%Y/%m}/{timestamp}-{digest[:12]}-{attachment_index}.{extension}"
        filename = decode_text(part.get_filename()) or image_path.rsplit("/", 1)[-1]

        supabase.upload(image_path, content, mime_type)
        try:
            supabase.insert_metadata({
                "camera_id": camera_id,
                "gmail_message_id": message_id,
                "attachment_index": attachment_index,
                "image_path": image_path,
                "filename": filename,
                "mime_type": mime_type,
                "size_bytes": len(content),
                "sha256": digest,
                "received_at": received_at.isoformat(),
            })
        except Exception:
            supabase.remove_upload(image_path)
            raise
        uploaded += 1

    return uploaded


def main():
    gmail_address = required_env("GMAIL_ADDRESS")
    gmail_app_password = required_env("GMAIL_APP_PASSWORD").replace(" ", "")
    supabase = Supabase(required_env("SUPABASE_URL"), required_env("SUPABASE_SERVICE_ROLE_KEY"))
    since = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%d-%b-%Y")
    total_uploaded = 0

    with imaplib.IMAP4_SSL("imap.gmail.com", 993) as mailbox:
        mailbox.login(gmail_address, gmail_app_password)
        status, _ = mailbox.select("INBOX", readonly=True)
        if status != "OK":
            raise RuntimeError("Kunne ikke apne Gmail-innboksen")
        status, data = mailbox.search(None, "SINCE", since)
        if status != "OK":
            raise RuntimeError("Gmail-soket mislyktes")

        message_numbers = data[0].split()
        for message_number in message_numbers:
            status, fetched = mailbox.fetch(message_number, "(RFC822)")
            if status != "OK" or not fetched or not isinstance(fetched[0], tuple):
                continue
            total_uploaded += process_message(supabase, fetched[0][1])

    print(f"Lastet opp {total_uploaded} nye viltkamerabilder.")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"FEIL: {error}", file=sys.stderr)
        raise
