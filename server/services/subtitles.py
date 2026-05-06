import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data" / "subtitles"

def get_subtitle_lines(episode_id: str) -> list:
    path = DATA_DIR / f"{episode_id}.json"
    if not path.exists():
        raise FileNotFoundError(f"Subtitles not found: {episode_id}")
    return json.loads(path.read_text(encoding="utf-8"))
