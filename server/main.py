import os
import pathlib
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = pathlib.Path(__file__).parent

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: tighten in production via CORS_ORIGINS env var
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/videos", StaticFiles(directory=BASE_DIR / "static" / "videos"), name="videos")

from routers import videos
app.include_router(videos.router, prefix="/api/videos")

from routers import subtitles
app.include_router(subtitles.router, prefix="/api/subtitles")

from routers import score
app.include_router(score.router, prefix="/api/score")

@app.get("/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=False)
