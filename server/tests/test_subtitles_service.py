import json
from unittest.mock import patch
from pathlib import Path
import pytest
from services.subtitles import get_subtitle_lines

def test_reads_and_returns_subtitle_json(tmp_path):
    lines = [{"index": 1, "startTime": 1000, "endTime": 4500, "english": "Hello", "chinese": "你好"}]
    subtitle_file = tmp_path / "xiyouji-ep1.json"
    subtitle_file.write_text(json.dumps(lines))

    with patch("services.subtitles.DATA_DIR", tmp_path):
        result = get_subtitle_lines("xiyouji-ep1")
        assert result == lines

def test_raises_for_unknown_episode(tmp_path):
    with patch("services.subtitles.DATA_DIR", tmp_path):
        with pytest.raises(FileNotFoundError):
            get_subtitle_lines("nonexistent")
