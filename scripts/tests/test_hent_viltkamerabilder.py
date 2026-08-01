import importlib.util
import unittest
from email.message import EmailMessage
from pathlib import Path


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "hent-viltkamerabilder.py"
SPEC = importlib.util.spec_from_file_location("hent_viltkamerabilder", SCRIPT_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


JPEG_CONTENT = b"\xff\xd8\xff\xe0jpeg-data"
PNG_CONTENT = b"\x89PNG\r\n\x1a\npng-data"
WEBP_CONTENT = b"RIFF\x08\x00\x00\x00WEBPwebp-data"


def message_with_attachment(content, filename, maintype="application", subtype="octet-stream"):
    message = EmailMessage()
    message.set_content("Kamerabilde")
    message.add_attachment(content, maintype=maintype, subtype=subtype, filename=filename)
    return message


class RecordingSupabase:
    def __init__(self):
        self.uploads = []
        self.metadata = []

    def already_processed(self, message_id, attachment_index):
        return False

    def upload(self, path, content, mime_type):
        self.uploads.append((path, content, mime_type))

    def insert_metadata(self, metadata):
        self.metadata.append(metadata)

    def remove_upload(self, path):
        raise AssertionError(f"Uventet sletting av {path}")


class ImagePartsTests(unittest.TestCase):
    def test_accepts_supported_images_sent_as_octet_stream(self):
        cases = (
            (JPEG_CONTENT, "SYDR0131.JPG", "image/jpeg"),
            (PNG_CONTENT, "kamera.PNG", "image/png"),
            (WEBP_CONTENT, "kamera.webp", "image/webp"),
        )

        for content, filename, expected_type in cases:
            with self.subTest(filename=filename):
                parts = list(MODULE.image_parts(message_with_attachment(content, filename)))

                self.assertEqual(len(parts), 1)
                self.assertEqual(parts[0][1], content)
                self.assertEqual(parts[0][2], expected_type)

    def test_rejects_octet_stream_with_wrong_signature(self):
        message = message_with_attachment(b"not-a-jpeg", "kamera.jpg")

        self.assertEqual(list(MODULE.image_parts(message)), [])

    def test_rejects_octet_stream_without_image_suffix(self):
        message = message_with_attachment(JPEG_CONTENT, "kamera.bin")

        self.assertEqual(list(MODULE.image_parts(message)), [])

    def test_keeps_standard_image_mime_type(self):
        message = message_with_attachment(JPEG_CONTENT, "kamera.jpg", "image", "jpeg")

        parts = list(MODULE.image_parts(message))

        self.assertEqual(len(parts), 1)
        self.assertEqual(parts[0][2], "image/jpeg")


class ProcessMessageTests(unittest.TestCase):
    def test_normalizes_camera_attachment_before_upload(self):
        message = message_with_attachment(JPEG_CONTENT, "SYDR0131.JPG")
        message["Subject"] = "SYDR0131.JPG"
        message["Date"] = "Sat, 01 Aug 2026 21:18:51 +0200"
        message["Message-ID"] = "<camera-message@example.com>"
        supabase = RecordingSupabase()

        uploaded = MODULE.process_message(supabase, message.as_bytes())

        self.assertEqual(uploaded, 1)
        self.assertEqual(len(supabase.uploads), 1)
        path, content, mime_type = supabase.uploads[0]
        self.assertRegex(path, r"^kamera-01/2026/08/20260801T191851Z-[a-f0-9]{12}-0\.jpg$")
        self.assertEqual(content, JPEG_CONTENT)
        self.assertEqual(mime_type, "image/jpeg")
        self.assertEqual(supabase.metadata[0]["filename"], "SYDR0131.JPG")
        self.assertEqual(supabase.metadata[0]["mime_type"], "image/jpeg")


if __name__ == "__main__":
    unittest.main()
