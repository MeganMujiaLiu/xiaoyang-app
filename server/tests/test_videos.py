import os
os.environ["SERVER_BASE_URL"] = "http://testserver"

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_get_videos_returns_list():
    res = client.get("/api/videos")
    assert res.status_code == 200
    assert isinstance(res.json(), list)
    assert len(res.json()) > 0

def test_episode_has_required_fields():
    res = client.get("/api/videos")
    ep = res.json()[0]
    assert ep["id"] == "xiyouji-ep1"
    assert isinstance(ep["series"], str)
    assert isinstance(ep["episode"], int)
    assert isinstance(ep["title"], str)
    assert isinstance(ep["duration"], int)
    assert ep["videoUrl"] == "http://testserver/videos/xiyouji-ep1.mp4"
    assert ep["subtitleId"] == "xiyouji-ep1"
