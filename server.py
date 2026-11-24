import json
import os
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / "dashboard-data.json"

app = FastAPI(title="Iron Frontier API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


def read_store():
    if not DATA_FILE.exists():
        DATA_FILE.write_text(
            json.dumps(
                {
                    "players": [{
                        "id": "player-1",
                        "name": "Iron Frontier Player",
                        "bestScore": 0,
                        "bestWave": 1,
                        "games": 0,
                        "zone": "desert",
                    }],
                    "runs": [],
                    "settings": {"music": True, "sfx": True, "ads": True},
                },
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def write_store(store):
    DATA_FILE.write_text(json.dumps(store, ensure_ascii=False), encoding="utf-8")


@app.get("/api/player/dashboard")
def player_dashboard():
    store = read_store()
    player = store["players"][0]
    return {
        "overview": {
            "name": player["name"],
            "bestScore": player["bestScore"],
            "bestWave": player["bestWave"],
            "games": player["games"],
            "zone": player["zone"],
            "weapons": ["Knife", "Bow", "Fire arrows", "Pistol", "Rifle", "Sniper", "Rocket", "Laser"],
        },
        "players": store["players"],
        "runs": store["runs"],
        "settings": store["settings"],
    }


@app.get("/api/admin/dashboard")
def admin_dashboard():
    return player_dashboard()


@app.post("/api/runs")
async def add_run(body: dict):
    store = read_store()
    run = {
        "id": os.urandom(16).hex(),
        "playerName": str(body.get("playerName") or "Iron Frontier Player"),
        "score": int(body.get("score") or 0),
        "wave": int(body.get("wave") or 1),
        "zone": str(body.get("zone") or "desert"),
        "createdAt": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }
    store["runs"].append(run)
    store["runs"] = store["runs"][-500:]
    player = store["players"][0]
    player["bestScore"] = max(int(player["bestScore"]), run["score"])
    player["bestWave"] = max(int(player["bestWave"]), run["wave"])
    player["games"] = int(player["games"]) + 1
    player["zone"] = run["zone"]
    write_store(store)
    return {"ok": True, "run": run}


@app.post("/api/admin/settings")
async def save_settings(body: dict):
    store = read_store()
    store["settings"] = {
        "music": bool(body.get("music")),
        "sfx": bool(body.get("sfx")),
        "ads": bool(body.get("ads")),
    }
    write_store(store)
    return {"ok": True}
