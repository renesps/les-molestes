#!/usr/bin/env python3
"""Auditoría de lo que se publica (public/, src/, dist/ si existe).

Uso: python3 scripts/audit_public.py   (sale con error si encuentra algo)

Revisa que NO aparezcan:
- IDs del Drive viejo (los de la base y los old_* del drive_map)
- mails, hashes de contraseñas o datos de las tablas auth_* del dump
- los colores viejos del admin de Django
Si input/dump.sql o input/drive_map.json no están (por ejemplo en GitHub), esas
partes se saltean y se avisa.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

TARGETS = [ROOT / "public", ROOT / "src", ROOT / "dist", ROOT / "index.html"]
TEXT_EXT = {".json", ".js", ".ts", ".tsx", ".css", ".html", ".webmanifest", ".md"}


def published_text():
    for t in TARGETS:
        files = [t] if t.is_file() else (t.rglob("*") if t.exists() else [])
        for f in files:
            if f.is_file() and f.suffix in TEXT_EXT:
                yield f, f.read_text(encoding="utf-8", errors="ignore")


def main():
    forbidden: dict[str, str] = {}
    drive_map = ROOT / "input" / "drive_map.json"
    if drive_map.exists():
        d = json.loads(drive_map.read_text(encoding="utf-8"))
        for v in d["matches"].values():
            if v.get("old_folder_id"):
                forbidden[v["old_folder_id"]] = "ID de carpeta del Drive viejo"
        for v in d["goal_clips"].values():
            if v.get("old_file_id"):
                forbidden[v["old_file_id"]] = "ID de video del Drive viejo"
    else:
        print("aviso: falta input/drive_map.json, no se revisan los IDs old_*")

    dump = ROOT / "input" / "dump.sql"
    if dump.exists():
        from build_data import parse_dump
        t = parse_dump(dump)
        for r in t["stats_match"]:
            for m in re.findall(r"[-\w]{25,}", r["media"] or ""):
                forbidden[m] = "ID de Drive viejo (stats_match.media)"
        for r in t["stats_goal"]:
            for m in re.findall(r"[-\w]{25,}", r["link"] or ""):
                forbidden[m] = "ID de Drive viejo (stats_goal.link)"
        for u in t.get("auth_user", []):
            for k in ("email", "password", "username", "first_name", "last_name"):
                if u.get(k) and len(u[k]) >= 4:
                    forbidden[u[k]] = f"dato de auth_user ({k})"
    else:
        print("aviso: falta input/dump.sql, no se revisan IDs ni usuarios de la base")

    patterns = {
        r"[\w.+-]+@[\w-]+\.[a-z]{2,}": "algo con forma de mail",
        r"pbkdf2_sha256\$": "hash de contraseña",
        r"#110A78|#F5DD5D|#13BEBE": "color viejo del admin",
    }

    found = 0
    checked = 0
    for f, text in published_text():
        checked += 1
        rel = f.relative_to(ROOT)
        for needle, why in forbidden.items():
            if needle in text:
                found += 1
                print(f"MAL {rel}: {why}")
        for pat, why in patterns.items():
            for m in re.finditer(pat, text, re.I):
                # el link al Instagram y el import de un paquete no son mails
                if "@lesmolestes" in m.group(0) or m.group(0).startswith("@"):
                    continue
                found += 1
                print(f"MAL {rel}: {why}: {m.group(0)[:40]}")
    print(f"{checked} archivos revisados, {len(forbidden)} valores prohibidos buscados, {found} problema(s)")
    sys.exit(1 if found else 0)


if __name__ == "__main__":
    main()
