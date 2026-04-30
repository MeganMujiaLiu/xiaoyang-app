import os
from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_videos():
    base = os.getenv("SERVER_BASE_URL", "http://localhost:8000")
    return [
        {
            "id": "xiyouji-ep1",
            "series": "西游记",
            "episode": 1,
            "title": "第1集",
            "duration": 1134,
            "videoUrl": f"{base}/videos/xiyouji-ep1.mp4",
            "subtitleId": "xiyouji-ep1"
        }
    ]
