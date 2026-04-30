from fastapi import APIRouter, HTTPException
from services.subtitles import get_subtitle_lines

router = APIRouter()

@router.get("/{episode_id}")
def get_subtitles(episode_id: str):
    try:
        return get_subtitle_lines(episode_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Subtitles not found: {episode_id}")
