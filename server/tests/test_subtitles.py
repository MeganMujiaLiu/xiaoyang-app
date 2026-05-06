# server/tests/test_subtitles.py
from unittest.mock import patch
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

MOCK_LINES = [
    {"index": 1, "startTime": 1000, "endTime": 4500, "english": "Hello", "chinese": "你好"}
]

def test_returns_subtitle_lines():
    with patch("routers.subtitles.get_subtitle_lines", return_value=MOCK_LINES):
        res = client.get("/api/subtitles/xiyouji-ep1")
        assert res.status_code == 200
        assert res.json() == MOCK_LINES

def test_returns_404_for_unknown_episode():
    with patch("routers.subtitles.get_subtitle_lines", side_effect=FileNotFoundError("not found")):
        res = client.get("/api/subtitles/nonexistent")
        assert res.status_code == 404
        assert "detail" in res.json()
