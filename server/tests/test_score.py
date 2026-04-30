# server/tests/test_score.py
from unittest.mock import patch
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_returns_score():
    with patch("routers.score.score_pronunciation", return_value=82):
        res = client.post("/api/score", json={"audio": "base64audio", "text": "Hello world"})
        assert res.status_code == 200
        assert res.json() == {"score": 82}

def test_returns_422_when_audio_missing():
    res = client.post("/api/score", json={"text": "Hello"})
    assert res.status_code == 422

def test_returns_422_when_text_missing():
    res = client.post("/api/score", json={"audio": "base64audio"})
    assert res.status_code == 422

def test_returns_502_when_service_throws():
    with patch("routers.score.score_pronunciation", side_effect=Exception("iFlytek error")):
        res = client.post("/api/score", json={"audio": "base64audio", "text": "Hello world"})
        assert res.status_code == 502
        assert "detail" in res.json()
