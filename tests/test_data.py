"""Verificación de los datos generados (cifras de aceptación del pedido).

Correr desde la raíz del proyecto:
    python3 -m unittest discover -s tests -v

Funciona sin dump.sql (revisa los JSON ya commiteados). Si el dump está en
input/, además compara contra la base original.
"""
import json
import re
import sys
import unittest
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "public" / "data"
DUMP = ROOT / "input" / "dump.sql"
sys.path.insert(0, str(ROOT / "scripts"))


def load(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


class TestCifras(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index = load("matches.json")
        cls.details = {m["id"]: load(f"matches/{m['id']}.json") for m in cls.index}
        cls.media = load("media.json")
        cls.players = load("players.json")
        cls.stats = load("stats.json")

    def test_243_partidos_por_circuito(self):
        self.assertEqual(len(self.index), 243)
        self.assertEqual(Counter(m["circuitId"] for m in self.index), {1: 198, 2: 32, 3: 13})

    def test_rango_de_fechas(self):
        dates = sorted(m["date"] for m in self.index)
        self.assertTrue(dates[0].startswith("2016-03-12"))
        self.assertTrue(dates[-1].startswith("2024-09-28"))
        self.assertTrue(all(d.endswith("-03:00") for d in dates), "todas las fechas con zona -03")

    def test_794_goles_105_con_video_103_archivos(self):
        goals = [g for m in self.details.values() for g in m["goals"]]
        self.assertEqual(len(goals), 794)
        with_video = [g for g in goals if g["video"]]
        self.assertEqual(len(with_video), 105)
        self.assertEqual(len({g["video"]["fileId"] for g in with_video}), 103)

    def test_resultado_consistente(self):
        for m in self.details.values():
            gf, ga = m["goalsFor"], m["goalsAgainst"]
            if gf is not None:
                self.assertGreaterEqual(gf, m["goalsDetailed"], f"partido {m['id']}: más goles que el marcador")
            if gf is not None and ga is not None:
                exp = "V" if gf > ga else "D" if gf < ga else "E"
                self.assertEqual(m["outcome"], exp, f"partido {m['id']}")

    def test_record_suma(self):
        o = self.stats["overall"]
        self.assertEqual(o["played"], 243)
        self.assertEqual(o["won"] + o["drawn"] + o["lost"] + o["unknown"], 243)
        self.assertEqual(o["goalsFor"], sum(m["goalsFor"] or 0 for m in self.index))

    def test_multimedia(self):
        with_media = [m for m in self.details.values() if m["media"]]
        self.assertEqual(len(with_media), 228)
        self.assertEqual(len(self.media["matches"]), 228)
        ids = {m["id"] for m in self.index}
        self.assertTrue({int(k) for k in self.media["matches"]} <= ids)
        goal_ids = {g["id"]: m["id"] for m in self.details.values() for g in m["goals"]}
        for gid, clip in self.media["goalClips"].items():
            self.assertEqual(goal_ids.get(int(gid)), clip["match_id"], f"clip de gol {gid}")
        without = set(self.media["dbMatchesWithoutDriveFolder"])
        self.assertEqual(len(without), 15)
        self.assertTrue(all(self.details[i]["media"] is None for i in without))

    def test_sin_ids_viejos_de_drive(self):
        blob = "".join(p.read_text(encoding="utf-8") for p in DATA.rglob("*.json"))
        self.assertNotIn("old_", blob)
        self.assertNotIn("usp=drive_link", blob)  # formato de los links viejos de la base

    def test_sin_datos_personales(self):
        blob = "".join(p.read_text(encoding="utf-8") for p in DATA.rglob("*.json"))
        self.assertIsNone(re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", blob), "hay algo con forma de mail")
        self.assertNotIn("pbkdf2_", blob)
        for k in ("email", "password", "phone", "dni"):
            self.assertNotIn(f'"{k}"', blob)

    def test_en_contra_no_es_jugador(self):
        self.assertNotIn(32, {p["id"] for p in self.players})
        for key in ("scorers", "assists", "appearances"):
            self.assertNotIn(32, {r["playerId"] for r in self.stats["rankings"][key]})
        own = [g for m in self.details.values() for g in m["goals"] if g["ownGoal"]]
        self.assertTrue(all(g["playerId"] is None for g in own))

    def test_goleadores_suman(self):
        total = sum(r["value"] for r in self.stats["rankings"]["scorers"])
        own = sum(1 for m in self.details.values() for g in m["goals"] if g["ownGoal"])
        self.assertEqual(total + own, 794)

    def test_tres_titulos(self):
        titles = load("titles.json")
        self.assertEqual([t["code"] for t in titles], ["RnG-2018-03", "RnG-2021-03", "RnG-2022-01"])
        self.assertEqual([bool(t["celebrationFolder"]) for t in titles], [False, True, True])

    def test_carpetas_2024_sin_partido(self):
        t = next(t for t in load("tournaments.json")["tournaments"] if t["code"] == "RnG-2024-04")
        self.assertEqual(len(t["unloadedMatchFolders"]), 3)


@unittest.skipUnless(DUMP.exists(), "sin input/dump.sql (normal en GitHub)")
class TestContraElDump(unittest.TestCase):
    def test_conteos_crudos(self):
        from build_data import parse_dump
        t = parse_dump(DUMP)
        self.assertEqual(len(t["stats_match"]), 243)
        self.assertEqual(len(t["stats_goal"]), 794)
        self.assertEqual(sum(1 for g in t["stats_goal"] if g["link"]), 105)
        self.assertEqual(len({g["link"] for g in t["stats_goal"] if g["link"]}), 103)
        for r in t["stats_match"]:
            a, _, b = (r["result"] or "None-None").partition("-")
            if a != "None" and r["goals_made"] is not None:
                self.assertEqual(int(a), int(r["goals_made"]), f"partido {r['id']}")
            if b != "None" and r["goals_received"] is not None:
                self.assertEqual(int(b), int(r["goals_received"]), f"partido {r['id']}")


if __name__ == "__main__":
    unittest.main()
