import importlib.util
import tempfile
import unittest
from pathlib import Path


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "raspberry" / "kjor-viltkamera.py"
SPEC = importlib.util.spec_from_file_location("kjor_viltkamera", SCRIPT_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class FakeMailbox:
    def __init__(self, uids):
        self.uids = uids
        self.calls = []

    def uid(self, *args):
        self.calls.append(args)
        return "OK", [self.uids]


class StateTests(unittest.TestCase):
    def test_saves_and_loads_state(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "imap-state.json"

            MODULE.save_state(path, "123", 456)

            self.assertEqual(MODULE.load_state(path), {"uidvalidity": "123", "last_uid": 456})

    def test_missing_state_is_allowed(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "missing.json"

            self.assertIsNone(MODULE.load_state(path))


class SearchTests(unittest.TestCase):
    def test_uses_only_uids_after_saved_watermark(self):
        mailbox = FakeMailbox(b"41 42 43")

        uids, incremental = MODULE.search_uids(
            mailbox,
            {"uidvalidity": "100", "last_uid": 42},
            "100",
            30,
        )

        self.assertTrue(incremental)
        self.assertEqual(uids, [b"43"])
        self.assertEqual(mailbox.calls[0], ("search", None, "UID", "43:*"))

    def test_uidvalidity_change_triggers_lookback(self):
        mailbox = FakeMailbox(b"7 8")

        uids, incremental = MODULE.search_uids(
            mailbox,
            {"uidvalidity": "old", "last_uid": 42},
            "new",
            30,
        )

        self.assertFalse(incremental)
        self.assertEqual(uids, [b"7", b"8"])
        self.assertEqual(mailbox.calls[0][0:3], ("search", None, "SINCE"))


class SupabaseHeaderTests(unittest.TestCase):
    def test_secret_key_is_only_sent_as_api_key(self):
        headers = MODULE.supabase_headers("sb_secret_example")

        self.assertEqual(headers, {"apikey": "sb_secret_example"})

    def test_legacy_service_role_is_also_sent_as_bearer_token(self):
        headers = MODULE.supabase_headers("legacy-jwt")

        self.assertEqual(
            headers,
            {"apikey": "legacy-jwt", "Authorization": "Bearer legacy-jwt"},
        )


if __name__ == "__main__":
    unittest.main()
