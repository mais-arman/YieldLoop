"""Offline regression tests: the equivalence checker must reject schema drift."""
import unittest
from unittest.mock import MagicMock, patch

from recovery_semantics import enum_signature, verify

SOURCE = "CHECK (((role)::text = ANY ((ARRAY['worker'::character varying, 'manager'::character varying])::text[])))"
RESTORED = "CHECK (((role)::text = ANY (ARRAY[('worker'::character varying)::text, ('manager'::character varying)::text])))"


class RecoverySemanticsTests(unittest.TestCase):
    def test_exact_supported_cast_forms(self):
        self.assertEqual(enum_signature(SOURCE), ("role", ("worker", "manager")))
        self.assertEqual(enum_signature(SOURCE), enum_signature(RESTORED))

    def test_fail_closed_parser(self):
        for text in (SOURCE.replace(" = ANY ", " <> ANY "),
                     SOURCE.replace("::text[]", "::integer[]"),
                     SOURCE + " OR true",
                     SOURCE.replace("'manager'", "NULL"),
                     SOURCE.replace("'manager'", "'man''ager'"),
                     "CHECK (true)"):
            with self.subTest(text=text):
                self.assertIsNone(enum_signature(text))
        self.assertNotEqual(enum_signature(SOURCE),
                            enum_signature(SOURCE.replace("'manager'", "'intruder'")))

    def test_catalog_drift_is_rejected_before_probes(self):
        key = ("accounts_user", "role_check")
        metadata = ("c", True, False, False, False, ["role"], SOURCE)
        columns = {("accounts_user", "role"): ("character varying(40)", True, "default", "", "")}
        variants = [
            ({}, columns),
            ({key: ("c", False, *metadata[2:])}, columns),
            ({key: (*metadata[:5], ["other"], SOURCE)}, columns),
            ({key: (*metadata[:-1], SOURCE.replace("'manager'", "'intruder'"))}, columns),
            ({key: metadata}, {("accounts_user", "role"): ("text", False, "default", "", "")}),
        ]
        restored = MagicMock()
        restored.cursor.return_value.__enter__.return_value.fetchone.return_value = (
            "test_yieldloop_restore_drill",)
        source = MagicMock()
        source.cursor.return_value.__enter__.return_value.fetchone.return_value = (
            "test_yieldloop_restore_drill",)
        for variant in variants:
            with self.subTest(variant=variant), patch(
                "recovery_semantics.catalog", side_effect=[({key: metadata}, columns), variant]
            ), patch("recovery_semantics.probe") as probe:
                with self.assertRaises(AssertionError):
                    verify(source, restored)
                probe.assert_not_called()

    def test_wrong_database_refused_before_catalog_or_writes(self):
        conn = MagicMock()
        conn.cursor.return_value.__enter__.return_value.fetchone.return_value = ("not_the_disposable_db",)
        with patch("recovery_semantics.catalog") as catalog:
            with self.assertRaises(AssertionError):
                verify(MagicMock(), conn)
            catalog.assert_not_called()


if __name__ == "__main__":
    unittest.main()
