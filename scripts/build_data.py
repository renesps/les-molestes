#!/usr/bin/env python3
"""Genera los JSON de la app a partir del dump viejo de Molestat.

Uso (desde la raíz del proyecto):
    python3 scripts/build_data.py

Lee:   input/dump.sql, input/drive_map.json   (privados, no van a git)
Escribe: public/data/*.json                  (depurados, sí van a git)
         docs/DATOS_INCONSISTENTES.md

Solo usa la librería estándar de Python. Si alguna cifra de control no da,
el script se corta con un error y no escribe nada.
"""
from __future__ import annotations

import json
import re
import shutil
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DUMP = ROOT / "input" / "dump.sql"
DRIVE_MAP = ROOT / "input" / "drive_map.json"
OUT = ROOT / "public" / "data"
INCONS_DOC = ROOT / "docs" / "DATOS_INCONSISTENTES.md"

OWN_GOAL_PLAYER_ID = 32  # "En Contra": goles en contra del rival, no es una persona
TITLE_CODES = {  # fuente de verdad del palmarés (pedido de René)
    "RnG-2018-03": "2018/19",
    "RnG-2021-03": "2021",
    "RnG-2022-01": "2022",
}
CIRCUIT_SHORT = {1: "RnG", 2: "Diag", 3: "SB"}

# Cifras de control (sección 3 del pedido)
EXPECTED = {
    "matches": 243,
    "matches_by_circuit": {1: 198, 2: 32, 3: 13},
    "first_date": "2016-03-12",
    "last_date": "2024-09-28",
    "goals": 794,
    "goals_with_video": 105,
    "distinct_videos": 103,
    "matches_with_folder": 228,
}


# ---------------------------------------------------------------- lectura
_ESC = {"\\": "\\", "n": "\n", "r": "\r", "t": "\t", "b": "\b", "f": "\f", "v": "\v"}


def _unescape(v: str) -> str | None:
    if v == "\\N":
        return None
    return re.sub(r"\\(.)", lambda m: _ESC.get(m.group(1), m.group(1)), v)


def parse_dump(path: Path) -> dict[str, list[dict]]:
    """Lee los bloques COPY ... FROM stdin; del dump de Postgres."""
    text = path.read_text(encoding="utf-8")
    tables: dict[str, list[dict]] = {}
    pat = re.compile(r"^COPY public\.(\w+) \((.*?)\) FROM stdin;\n(.*?)^\\\.$", re.S | re.M)
    for m in pat.finditer(text):
        name, cols, body = m.groups()
        cols = [c.strip().strip('"') for c in cols.split(",")]
        rows = []
        for line in body.split("\n"):
            if not line:
                continue
            vals = [_unescape(v) for v in line.split("\t")]
            if len(vals) != len(cols):
                raise ValueError(f"{name}: fila con {len(vals)} campos, se esperaban {len(cols)}")
            rows.append(dict(zip(cols, vals)))
        tables[name] = rows
    return tables


def _int(v):
    return None if v is None or v == "None" else int(v)


def _bool(v):
    return v == "t"


def _iso(pg_ts: str) -> str:
    """'2016-03-12 13:00:00-03' -> '2016-03-12T13:00:00-03:00' (se respeta la zona)."""
    dt = datetime.strptime(pg_ts + "00" if re.search(r"[+-]\d\d$", pg_ts) else pg_ts,
                           "%Y-%m-%d %H:%M:%S%z")
    return dt.isoformat()


def _parse_result(s):
    if s is None:
        return None, None
    a, _, b = s.partition("-")
    return _int(a.strip() or None), _int(b.strip() or None)


OUTCOME_FROM_FINAL = {"Victoria": "V", "Empate": "E", "Derrota": "D"}


def _outcome(gf, ga):
    if gf is None or ga is None:
        return None
    return "V" if gf > ga else "D" if gf < ga else "E"


# ---------------------------------------------------------------- modelo
def build(tables: dict, drive: dict):
    issues: list[dict] = []

    def issue(kind, text, **ref):
        issues.append({"tipo": kind, "detalle": text, **ref})

    circuits = {int(r["id"]): {"id": int(r["id"]), "name": r["name"], "short": CIRCUIT_SHORT.get(int(r["id"]))}
                for r in tables["stats_torneo"]}
    courts = {int(r["id"]): {"id": int(r["id"]), "name": r["code"], "number": _int(r["court"]),
                             "circuitId": _int(r["torneo_id"])} for r in tables["stats_court"]}
    shirts = {int(r["id"]): {"id": int(r["id"]), "name": r["edition"]} for r in tables["stats_shirt"]}
    teams_raw = {int(r["id"]): r for r in tables["stats_team"]}
    players_raw = {int(r["id"]): r for r in tables["stats_player"]}

    tournaments = {}
    for r in tables["stats_tournament"]:
        tid = int(r["id"])
        cid = int(r["name_id"])
        ed = _int(r["edition"])
        year = _int(r["year"])
        code = r["code"]
        if ed == 0:
            label = f"{code} {year}"
        else:
            label = f"{circuits[cid]['name']} {year} · Torneo {ed}"
        tournaments[tid] = {
            "id": tid, "circuitId": cid, "year": year, "edition": ed, "code": code,
            "name": label, "position": _int(r["position"]), "zone": r["zona"],
            "isCup": ed == 0, "isTitle": code in TITLE_CODES,
        }

    # alineaciones y tarjetas por partido
    starters, bench = defaultdict(list), defaultdict(list)
    for r in tables["stats_match_starter"]:
        starters[int(r["match_id"])].append(int(r["player_id"]))
    for r in tables["stats_match_bench"]:
        bench[int(r["match_id"])].append(int(r["player_id"]))
    yellows, reds = defaultdict(list), defaultdict(list)
    for r in tables["stats_yellowcard"]:
        yellows[int(r["game_id"])].append({"playerId": int(r["author_id"])})
    for r in tables["stats_redcard"]:
        reds[int(r["game_id"])].append({"playerId": int(r["author_id"]), "kind": r["tipo"]})

    clips = drive["goal_clips"]
    goals_by_match = defaultdict(list)
    for r in sorted(tables["stats_goal"], key=lambda r: int(r["id"])):
        gid = int(r["id"])
        clip = clips.get(str(gid))
        author = _int(r["author_id"])
        goals_by_match[int(r["game_id"])].append({
            "id": gid,
            "playerId": None if author == OWN_GOAL_PLAYER_ID else author,
            "ownGoal": author == OWN_GOAL_PLAYER_ID,
            "assistId": _int(r["assist_id"]),
            "penalty": _bool(r["penalty"]),
            "freeKick": _bool(r["freekick"]),
            "period": r["period"],
            "scoreAfter": r["score"],
            "video": {"previewUrl": clip["preview_url"], "viewUrl": clip["view_url"],
                      "fileId": clip["file_id"]} if clip else None,
        })

    match_folders = drive["matches"]
    matches = {}
    for r in tables["stats_match"]:
        mid = int(r["id"])
        cid = int(r["torneo_id"])
        tid = int(r["tournament_id"])
        res_a, res_b = _parse_result(r["result"])
        gm, gr = _int(r["goals_made"]), _int(r["goals_received"])
        if gm is not None and res_a is not None and gm != res_a:
            issue("resultado", f"Resultado '{r['result']}' pero goles a favor = {gm}", match=mid)
        if gr is not None and res_b is not None and gr != res_b:
            issue("resultado", f"Resultado '{r['result']}' pero goles en contra = {gr}", match=mid)
        if (gm is None) != (res_a is None) or (gr is None) != (res_b is None):
            issue("resultado", f"Resultado '{r['result']}' y goles a favor/en contra "
                  f"({r['goals_made']}/{r['goals_received']}) no coinciden en qué dato falta", match=mid)
        gf = gm if gm is not None else res_a
        ga = gr if gr is not None else res_b
        if gf is None or ga is None:
            issue("sin_resultado", f"Resultado incompleto en la base: '{r['result']}'. "
                  f"Se muestra 'sin dato' en lo que falte.", match=mid)

        final = OUTCOME_FROM_FINAL.get(r["final"]) if r["final"] else None
        calc = _outcome(gf, ga)
        if calc and final and calc != final:
            issue("resultado", f"Marcador {gf}-{ga} pero el campo 'final' dice '{r['final']}'", match=mid)
        outcome = calc or final
        outcome_source = "marcador" if calc else ("campo_final" if final else None)

        t = tournaments[tid]
        if t["circuitId"] != cid:
            issue("circuito", f"Edición {t['code']} es de circuito {t['circuitId']} pero el partido "
                  f"dice circuito {cid}", match=mid)
        court_id = _int(r["court_id"])
        if court_id and courts[court_id]["circuitId"] != cid:
            issue("cancha", f"Cancha '{courts[court_id]['name']}' en partido del circuito "
                  f"{circuits[cid]['name']}", match=mid)

        g = goals_by_match.get(mid, [])
        if gf is not None and len(g) > gf:
            issue("goles", f"Hay {len(g)} goles cargados pero el marcador dice {gf} a favor", match=mid)

        folder = match_folders.get(str(mid))
        dt = _iso(r["date"])
        matches[mid] = {
            "id": mid,
            "date": dt,
            "year": int(dt[:4]),
            "circuitId": cid,
            "tournamentId": tid,
            "rivalId": int(r["rival_id"]),
            "matchday": _int(r["matchday"]),
            "cupRound": r["fase_copa"],
            "goalsFor": gf,
            "goalsAgainst": ga,
            "outcome": outcome,
            "outcomeSource": outcome_source,
            "courtId": court_id,
            "shirtId": _int(r["shirt_id"]),
            "goalkeeperId": _int(r["goalkeeper_id"]),
            "weather": r["weather"],
            "formation": r["esquema_inicial"],
            "toletole": _bool(r["toletole"]),
            "notes": r["notes"].replace("\r\n", "\n").strip() if r["notes"] and r["notes"].strip() else None,
            "starters": sorted(starters.get(mid, [])),
            "bench": sorted(bench.get(mid, [])),
            "goals": g,
            "goalsDetailed": len(g),
            "yellowCards": yellows.get(mid, []),
            "redCards": reds.get(mid, []),
            "media": {"folderId": folder["folder_id"], "folderUrl": folder["folder_url"],
                      "source": folder["source"], "title": folder["drive_title"]} if folder else None,
        }
        if gf is not None and len(g) < gf:
            issue("goles_sin_detalle", f"Marcador {gf} a favor, {len(g)} goles con autor cargado "
                  f"(faltan {gf - len(g)})", match=mid)

    # chequeos cruzados con la base
    for mid in set(goals_by_match) - set(matches):
        issue("huérfano", f"Goles de un partido {mid} que no existe")
    for coll, name in ((starters, "titular"), (bench, "suplente")):
        for mid, ps in coll.items():
            for p in ps:
                if p not in players_raw:
                    issue("huérfano", f"{name} con jugador inexistente {p}", match=mid)
            dup = [p for p, c in Counter(ps).items() if c > 1]
            if dup:
                issue("alineación", f"Jugador(es) {dup} repetido(s) como {name}", match=mid)
    for mid in set(starters) & set(bench):
        both = set(starters[mid]) & set(bench[mid])
        if both:
            issue("alineación", f"Jugador(es) {sorted(both)} figuran como titular y suplente a la vez", match=mid)
    for mid, m in matches.items():
        played = set(m["starters"]) | set(m["bench"])
        for gl in m["goals"]:
            if gl["playerId"] and played and gl["playerId"] not in played:
                issue("alineación", f"Gol (id {gl['id']}) de {players_raw[gl['playerId']]['name']} "
                      f"que no figura en titulares ni suplentes", match=mid)
        for c in m["yellowCards"] + m["redCards"]:
            if played and c["playerId"] not in played:
                issue("alineación", f"Tarjeta de {players_raw[c['playerId']]['name']} "
                      f"que no figura en titulares ni suplentes", match=mid)
        if not m["starters"] and not m["bench"]:
            issue("sin_alineación", "Partido sin titulares ni suplentes cargados", match=mid)
    for r in tables["stats_redcard"]:
        if not r["tipo"]:
            issue("tarjeta", f"Tarjeta roja (id {r['id']}) sin tipo (directa / doble amarilla)",
                  match=int(r["game_id"]))
    for pid, p in players_raw.items():
        if p["notes"] and p["notes"].strip():
            issue("nota_jugador", f"Nota en la ficha de {p['name']}: \"{p['notes'].strip()}\"")

    # media: chequeo de que todo exista
    for k, clip in clips.items():
        gid = int(k)
        owner = next((m for m in matches.values() if any(g["id"] == gid for g in m["goals"])), None)
        if owner is None:
            raise SystemExit(f"drive_map: goal_clip {gid} no existe en stats_goal")
        if owner["id"] != clip["match_id"]:
            raise SystemExit(f"drive_map: goal_clip {gid} dice partido {clip['match_id']}, "
                             f"la base dice {owner['id']}")
    for k in match_folders:
        if int(k) not in matches:
            raise SystemExit(f"drive_map: partido {k} no existe en la base")
    without = set(drive["db_matches_without_drive_folder"])
    if without | {int(k) for k in match_folders} != set(matches) or without & {int(k) for k in match_folders}:
        raise SystemExit("drive_map: partidos con carpeta + sin carpeta no suman todos los partidos")
    codes = {t["code"] for t in tournaments.values()}
    for f in drive["champion_celebration_folders"]:
        if f["edition_code"] not in codes:
            raise SystemExit(f"drive_map: edición {f['edition_code']} no existe")

    return circuits, courts, shirts, teams_raw, players_raw, tournaments, matches, issues


# ---------------------------------------------------------------- agregados
def empty_record():
    return {"played": 0, "won": 0, "drawn": 0, "lost": 0, "unknown": 0,
            "goalsFor": 0, "goalsAgainst": 0}


def add_to_record(rec, m):
    rec["played"] += 1
    key = {"V": "won", "E": "drawn", "D": "lost"}.get(m["outcome"], "unknown")
    rec[key] += 1
    rec["goalsFor"] += m["goalsFor"] or 0
    rec["goalsAgainst"] += m["goalsAgainst"] or 0


def record_of(ms):
    rec = empty_record()
    for m in ms:
        add_to_record(rec, m)
    return rec


def ranking(counter: Counter, players, limit=None):
    rows = [{"playerId": pid, "name": players[pid]["name"], "value": v}
            for pid, v in counter.items() if v and pid in players]
    rows.sort(key=lambda r: (-r["value"], r["name"]))
    return rows[:limit] if limit else rows


def aggregate(circuits, courts, shirts, teams_raw, players_raw, tournaments, matches, drive):
    ms = sorted(matches.values(), key=lambda m: m["date"])

    # ---- jugadores
    real_players = {pid: p for pid, p in players_raw.items() if pid != OWN_GOAL_PLAYER_ID}
    pstat = {pid: {"apps": set(), "starts": 0, "bench": 0, "goals": 0, "assists": 0,
                   "penalties": 0, "freeKicks": 0, "yellow": 0, "red": 0, "videoGoals": [],
                   "gkMatches": [], "years": set(), "circuits": set()}
             for pid in real_players}
    for m in ms:
        for pid in m["starters"]:
            if pid in pstat:
                pstat[pid]["starts"] += 1
        for pid in m["bench"]:
            if pid in pstat:
                pstat[pid]["bench"] += 1
        for pid in set(m["starters"]) | set(m["bench"]):
            if pid in pstat:
                pstat[pid]["apps"].add(m["id"])
        for g in m["goals"]:
            if g["playerId"] in pstat:
                s = pstat[g["playerId"]]
                s["goals"] += 1
                s["penalties"] += g["penalty"]
                s["freeKicks"] += g["freeKick"]
                s["apps"].add(m["id"])
                if g["video"]:
                    s["videoGoals"].append({"goalId": g["id"], "matchId": m["id"]})
            if g["assistId"] in pstat:
                pstat[g["assistId"]]["assists"] += 1
        for c in m["yellowCards"]:
            if c["playerId"] in pstat:
                pstat[c["playerId"]]["yellow"] += 1
        for c in m["redCards"]:
            if c["playerId"] in pstat:
                pstat[c["playerId"]]["red"] += 1
        if m["goalkeeperId"] in pstat:
            pstat[m["goalkeeperId"]]["gkMatches"].append(m["id"])
            pstat[m["goalkeeperId"]]["apps"].add(m["id"])
    for pid, s in pstat.items():
        for mid in s["apps"]:
            s["years"].add(matches[mid]["year"])
            s["circuits"].add(matches[mid]["circuitId"])

    players_out = []
    for pid, p in sorted(real_players.items(), key=lambda kv: kv[1]["name"]):
        s = pstat[pid]
        apps = sorted(s["apps"], key=lambda mid: matches[mid]["date"])
        gk = s["gkMatches"]
        players_out.append({
            "id": pid, "name": p["name"], "number": _int(p["number"]),
            "matches": len(apps), "starts": s["starts"], "benchApps": s["bench"],
            "goals": s["goals"], "assists": s["assists"], "penaltyGoals": s["penalties"],
            "freeKickGoals": s["freeKicks"], "yellowCards": s["yellow"], "redCards": s["red"],
            "firstYear": min(s["years"]) if s["years"] else None,
            "lastYear": max(s["years"]) if s["years"] else None,
            "years": sorted(s["years"]),
            "circuits": sorted(s["circuits"]),
            "firstMatchId": apps[0] if apps else None,
            "lastMatchId": apps[-1] if apps else None,
            "matchIds": apps,
            "videoGoals": s["videoGoals"],
            "goalkeeper": {"matches": len(gk),
                           "goalsAgainst": sum(matches[i]["goalsAgainst"] or 0 for i in gk),
                           "cleanSheets": sum(1 for i in gk if matches[i]["goalsAgainst"] == 0)} if gk else None,
        })

    # ---- rivales
    by_rival = defaultdict(list)
    for m in ms:
        by_rival[m["rivalId"]].append(m)
    teams_out = []
    for tid, t in sorted(teams_raw.items(), key=lambda kv: kv[1]["name"].lower()):
        tm = by_rival.get(tid, [])
        teams_out.append({"id": tid, "name": t["name"], "cacoLevel": t["caco_level"],
                          "record": record_of(tm), "matchIds": [m["id"] for m in tm],
                          "circuits": sorted({m["circuitId"] for m in tm})})

    # ---- torneos
    by_tour = defaultdict(list)
    for m in ms:
        by_tour[m["tournamentId"]].append(m)
    extra = defaultdict(list)
    for f in drive["drive_folders_without_db_match"]:
        code = f"RnG-{f['year']}-{int(f['torneo']):02d}"
        extra[code].append({"folderId": f["folder_id"], "folderUrl": f["folder_url"], "title": f["title"]})
    celebr = {f["edition_code"]: {"folderId": f["folder_id"], "folderUrl": f["folder_url"],
                                  "title": f["title"]} for f in drive["champion_celebration_folders"]}
    tours_out = []
    for t in sorted(tournaments.values(), key=lambda t: (t["year"], t["circuitId"], t["edition"])):
        tm = by_tour.get(t["id"], [])
        tours_out.append({**t, "record": record_of(tm), "matchIds": [m["id"] for m in tm],
                          "firstDate": tm[0]["date"] if tm else None,
                          "lastDate": tm[-1]["date"] if tm else None,
                          "unloadedMatchFolders": extra.get(t["code"], []),
                          "celebrationFolder": celebr.get(t["code"])})
    circuits_out = [{**c, "record": record_of([m for m in ms if m["circuitId"] == cid]),
                     "tournamentIds": [t["id"] for t in tours_out if t["circuitId"] == cid]}
                    for cid, c in sorted(circuits.items())]

    # ---- títulos
    titles = []
    for code, label in TITLE_CODES.items():
        t = next(t for t in tours_out if t["code"] == code)
        titles.append({"code": code, "label": label, "tournamentId": t["id"], "circuitId": t["circuitId"],
                       "name": t["name"], "zone": t["zone"], "positionInDb": t["position"],
                       "record": t["record"], "matchIds": t["matchIds"],
                       "celebrationFolder": t["celebrationFolder"]})

    # ---- rankings
    pl = {p["id"]: p for p in players_out}

    def goal_counter(filter_fn):
        c = Counter()
        for m in ms:
            if filter_fn(m):
                for g in m["goals"]:
                    if g["playerId"]:
                        c[g["playerId"]] += 1
        return c

    rankings = {
        "scorers": ranking(Counter({p["id"]: p["goals"] for p in players_out}), pl),
        "assists": ranking(Counter({p["id"]: p["assists"] for p in players_out}), pl),
        "appearances": ranking(Counter({p["id"]: p["matches"] for p in players_out}), pl),
        "yellowCards": ranking(Counter({p["id"]: p["yellowCards"] for p in players_out}), pl),
        "redCards": ranking(Counter({p["id"]: p["redCards"] for p in players_out}), pl),
        "goalkeepers": sorted(
            [{"playerId": p["id"], "name": p["name"], **p["goalkeeper"]} for p in players_out if p["goalkeeper"]],
            key=lambda r: (-r["matches"], r["name"])),
        "scorersByCircuit": {str(cid): ranking(goal_counter(lambda m, c=cid: m["circuitId"] == c), pl)
                             for cid in circuits},
        "scorersByYear": {str(y): ranking(goal_counter(lambda m, y=y: m["year"] == y), pl)
                          for y in sorted({m["year"] for m in ms})},
        "scorersByTournament": {str(t["id"]): ranking(goal_counter(lambda m, i=t["id"]: m["tournamentId"] == i), pl)
                                for t in tours_out},
    }

    # ---- datos curiosos
    def group_record(keyfn, names=None):
        groups = defaultdict(list)
        for m in ms:
            k = keyfn(m)
            if k is not None:
                groups[k].append(m)
        return [{"key": k, "label": names[k] if names else k, "record": record_of(v)}
                for k, v in sorted(groups.items(), key=lambda kv: -len(kv[1]))]

    caco_by_team = {tid: t["caco_level"] for tid, t in teams_raw.items()}
    known = [m for m in ms if m["goalsFor"] is not None and m["goalsAgainst"] is not None]
    biggest_win = max(known, key=lambda m: (m["goalsFor"] - m["goalsAgainst"], m["goalsFor"]))
    biggest_loss = min(known, key=lambda m: (m["goalsFor"] - m["goalsAgainst"], -m["goalsAgainst"]))
    most_goals = max(known, key=lambda m: m["goalsFor"] + m["goalsAgainst"])

    def longest(pred):
        best, cur, start, best_span = 0, 0, None, None
        for m in ms:
            if m["outcome"] and pred(m["outcome"]):
                cur += 1
                start = start or m["id"]
                if cur > best:
                    best, best_span = cur, (start, m["id"])
            else:
                cur, start = 0, None
        return {"length": best, "fromMatchId": best_span[0] if best_span else None,
                "toMatchId": best_span[1] if best_span else None}

    hat = []
    for m in ms:
        for pid, n in Counter(g["playerId"] for g in m["goals"] if g["playerId"]).items():
            if n >= 3:
                hat.append({"matchId": m["id"], "playerId": pid, "name": pl[pid]["name"], "goals": n})
    hat.sort(key=lambda h: (-h["goals"], matches[h["matchId"]]["date"]))

    curiosities = {
        "toletole": {"matchIds": [m["id"] for m in ms if m["toletole"]],
                     "record": record_of([m for m in ms if m["toletole"]]),
                     "meaningConfirmed": False},
        "cacoLevel": {"byLevel": group_record(lambda m: caco_by_team.get(m["rivalId"])),
                      "teams": [{"teamId": tid, "name": t["name"], "level": t["caco_level"]}
                                for tid, t in sorted(teams_raw.items(), key=lambda kv: kv[1]["name"])
                                if t["caco_level"]],
                      "meaningConfirmed": False},
        "byWeather": group_record(lambda m: m["weather"]),
        "byShirt": group_record(lambda m: m["shirtId"], {k: v["name"] for k, v in shirts.items()}),
        "byFormation": group_record(lambda m: m["formation"]),
        "biggestWin": biggest_win["id"],
        "biggestLoss": biggest_loss["id"],
        "mostGoalsMatch": most_goals["id"],
        "longestWinStreak": longest(lambda o: o == "V"),
        "longestUnbeatenStreak": longest(lambda o: o in ("V", "E")),
        "hatTricks": hat,
        "penaltyGoals": sum(g["penalty"] for m in ms for g in m["goals"]),
        "freeKickGoals": sum(g["freeKick"] for m in ms for g in m["goals"]),
        "ownGoalsByRivals": sum(g["ownGoal"] for m in ms for g in m["goals"]),
    }

    stats = {
        "overall": record_of(ms),
        "byCircuit": {str(c["id"]): c["record"] for c in circuits_out},
        "byYear": {str(y): record_of([m for m in ms if m["year"] == y]) for y in sorted({m["year"] for m in ms})},
        "rankings": rankings,
        "curiosities": curiosities,
    }

    return players_out, teams_out, tours_out, circuits_out, titles, stats


def media_json(drive):
    """Copia limpia del drive_map: sin IDs viejos ni el readme."""
    def clean(d):
        return {k: v for k, v in d.items() if not k.startswith("old_")}
    return {
        "driveRoot": drive["drive_root"],
        "matches": {k: clean(v) for k, v in drive["matches"].items()},
        "goalClips": {k: clean(v) for k, v in drive["goal_clips"].items()},
        "championCelebrationFolders": drive["champion_celebration_folders"],
        "driveFoldersWithoutDbMatch": drive["drive_folders_without_db_match"],
        "dbMatchesWithoutDriveFolder": drive["db_matches_without_drive_folder"],
    }


# ---------------------------------------------------------------- controles
def check_expected(tables, matches, drive):
    errs = []
    def eq(name, got, exp):
        if got != exp:
            errs.append(f"{name}: dio {got}, se esperaba {exp}")
    eq("partidos", len(matches), EXPECTED["matches"])
    eq("partidos por circuito", dict(Counter(m["circuitId"] for m in matches.values())),
       EXPECTED["matches_by_circuit"])
    dates = sorted(m["date"][:10] for m in matches.values())
    eq("primera fecha", dates[0], EXPECTED["first_date"])
    eq("última fecha", dates[-1], EXPECTED["last_date"])
    eq("goles", len(tables["stats_goal"]), EXPECTED["goals"])
    eq("goles con video", len(drive["goal_clips"]), EXPECTED["goals_with_video"])
    eq("videos distintos", len({c["file_id"] for c in drive["goal_clips"].values()}), EXPECTED["distinct_videos"])
    eq("goles con link en la base", sum(1 for g in tables["stats_goal"] if g["link"]), EXPECTED["goals_with_video"])
    eq("partidos con carpeta", len(drive["matches"]), EXPECTED["matches_with_folder"])
    if errs:
        raise SystemExit("Las cifras de control NO dan:\n  " + "\n  ".join(errs))


# ---------------------------------------------------------------- salida
def write_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":"), sort_keys=False) + "\n",
                    encoding="utf-8")


def write_issues_doc(issues, matches, teams_raw, tournaments):
    by_kind = defaultdict(list)
    for i in issues:
        by_kind[i["tipo"]].append(i)
    titles = {
        "resultado": "Resultado que no coincide con los goles a favor/en contra o con el campo 'final'",
        "sin_resultado": "Partidos sin resultado completo en la base",
        "goles": "Más goles cargados que los del marcador",
        "goles_sin_detalle": "Partidos con menos goles detallados que el marcador (falta saber quién los hizo)",
        "circuito": "Edición y circuito que no coinciden",
        "cancha": "Cancha de otro circuito",
        "alineación": "Alineaciones raras",
        "sin_alineación": "Partidos sin alineación cargada",
        "tarjeta": "Tarjetas incompletas",
        "nota_jugador": "Notas en fichas de jugadores",
        "huérfano": "Registros que apuntan a cosas que no existen",
    }
    explain = {
        "goles_sin_detalle": "La app muestra el resultado real y solo los goles que tienen autor; "
                             "el resto aparece como \"gol sin autor cargado\". No se inventa nada.",
        "sin_resultado": "Si falta el marcador, la app muestra \"sin dato\". Para el récord (G/E/P) "
                         "se usa el campo `final` de la base (Victoria/Empate/Derrota) cuando existe.",
        "sin_alineación": "La app muestra \"Alineación sin dato\" en esos partidos.",
    }

    def mref(i):
        mid = i.get("match")
        if not mid:
            return ""
        m = matches[mid]
        d = datetime.fromisoformat(m["date"]).strftime("%d/%m/%Y")
        return f"Partido {mid} · {d} vs {teams_raw[m['rivalId']]['name']} ({tournaments[m['tournamentId']]['code']}) — "

    lines = ["# Datos inconsistentes", "",
             "Generado automáticamente por `scripts/build_data.py`. **Nada de esto se \"arregló\"**: "
             "la app muestra lo que dice la base y, si falta algo, dice \"sin dato\".", "",
             f"Total de observaciones: **{len(issues)}**.", ""]
    order = ["resultado", "sin_resultado", "goles", "circuito", "cancha", "tarjeta", "alineación",
             "huérfano", "nota_jugador", "sin_alineación", "goles_sin_detalle"]
    for k in order + sorted(set(by_kind) - set(order)):
        if k not in by_kind:
            continue
        items = sorted(by_kind[k], key=lambda i: matches[i["match"]]["date"] if i.get("match") else "")
        lines += [f"## {titles.get(k, k)} ({len(items)})", ""]
        if k in explain:
            lines += [explain[k], ""]
        lines += [f"- {mref(i)}{i['detalle']}" for i in items]
        lines.append("")
    empty = [titles[k] for k in order if k not in by_kind]
    if empty:
        lines += ["## Controles que dieron bien (0 casos)", ""] + [f"- {t}" for t in empty] + [""]
    INCONS_DOC.parent.mkdir(parents=True, exist_ok=True)
    INCONS_DOC.write_text("\n".join(lines), encoding="utf-8")


def main():
    if not DUMP.exists():
        sys.exit(f"No encuentro {DUMP}. Copiá el dump.sql a la carpeta input/.")
    tables = parse_dump(DUMP)
    drive = json.loads(DRIVE_MAP.read_text(encoding="utf-8"))
    (circuits, courts, shirts, teams_raw, players_raw,
     tournaments, matches, issues) = build(tables, drive)
    check_expected(tables, matches, drive)
    players, teams, tours, circs, titles, stats = aggregate(
        circuits, courts, shirts, teams_raw, players_raw, tournaments, matches, drive)

    if OUT.exists():
        shutil.rmtree(OUT)
    ms = sorted(matches.values(), key=lambda m: m["date"], reverse=True)
    index_keys = ["id", "date", "year", "circuitId", "tournamentId", "rivalId", "matchday", "cupRound",
                  "goalsFor", "goalsAgainst", "outcome"]
    write_json(OUT / "matches.json", [
        {**{k: m[k] for k in index_keys},
         "hasMedia": m["media"] is not None,
         "videoGoals": sum(1 for g in m["goals"] if g["video"]),
         "goalsDetailed": m["goalsDetailed"],
         "toletole": m["toletole"]} for m in ms])
    for m in ms:
        write_json(OUT / "matches" / f"{m['id']}.json", m)
    write_json(OUT / "players.json", players)
    write_json(OUT / "teams.json", teams)
    write_json(OUT / "tournaments.json", {"circuits": circs, "tournaments": tours})
    write_json(OUT / "lookups.json", {"courts": list(courts.values()), "shirts": list(shirts.values()),
                                      "circuits": list(circuits.values())})
    write_json(OUT / "titles.json", titles)
    write_json(OUT / "stats.json", stats)
    write_json(OUT / "media.json", media_json(drive))
    write_json(OUT / "meta.json", {
        "clubName": "Club Social y Deportivo Les Molestes",
        "shortName": "Les Molestes",
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "firstMatchDate": ms[-1]["date"], "lastMatchDate": ms[0]["date"],
        "counts": {"matches": len(ms), "goals": sum(m["goalsDetailed"] for m in ms),
                   "goalsWithVideo": len(drive["goal_clips"]),
                   "distinctVideos": len({c["file_id"] for c in drive["goal_clips"].values()}),
                   "matchesWithMedia": sum(1 for m in ms if m["media"]),
                   "players": len(players), "rivals": len(teams), "tournaments": len(tours)},
        "inconsistencies": len(issues),
    })
    write_issues_doc(issues, matches, teams_raw, tournaments)
    print(f"OK: {len(ms)} partidos, {sum(m['goalsDetailed'] for m in ms)} goles, "
          f"{len(players)} jugadores, {len(teams)} rivales, {len(tours)} ediciones, "
          f"{len(issues)} observaciones en {INCONS_DOC.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
