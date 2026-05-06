from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.iflytek import score_pronunciation

router = APIRouter()

class ScoreRequest(BaseModel):
    audio: str
    text: str

@router.post("/")
def post_score(body: ScoreRequest):
    try:
        score = score_pronunciation(body.audio, body.text)
        return {"score": score}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e) or "Scoring failed")
