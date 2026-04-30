# server/tests/test_iflytek.py
import os
import base64
from unittest.mock import patch, MagicMock
import pytest
from services.iflytek import score_pronunciation

def setup_function():
    os.environ["IFLYTEK_APPID"] = "test-appid"
    os.environ["IFLYTEK_API_KEY"] = "test-key"

def test_calls_iflytek_and_returns_rounded_score():
    xml = '<result total_score="82.5"></result>'
    xml_b64 = base64.b64encode(xml.encode()).decode()
    mock_response = MagicMock()
    mock_response.json.return_value = {"payload": {"result": {"text": xml_b64}}}

    with patch("httpx.post", return_value=mock_response) as mock_post:
        score = score_pronunciation("base64audio", "Hello world")
        assert score == 83
        assert mock_post.call_args.kwargs["headers"]["X-Appid"] == "test-appid"

def test_raises_when_no_total_score():
    xml_b64 = base64.b64encode(b"<result></result>").decode()
    mock_response = MagicMock()
    mock_response.json.return_value = {"payload": {"result": {"text": xml_b64}}}
    with patch("httpx.post", return_value=mock_response):
        with pytest.raises(ValueError, match="No total_score"):
            score_pronunciation("audio", "text")

def test_raises_when_httpx_fails():
    with patch("httpx.post", side_effect=Exception("network error")):
        with pytest.raises(Exception, match="network error"):
            score_pronunciation("audio", "text")
