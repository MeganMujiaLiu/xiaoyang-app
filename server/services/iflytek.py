import os
import base64
import decimal
import hashlib
import json
import re
import time
import httpx

def score_pronunciation(base64_audio: str, reference_text: str) -> int:
    appid = os.getenv("IFLYTEK_APPID")
    api_key = os.getenv("IFLYTEK_API_KEY")
    cur_time = str(int(time.time()))

    param = {
        "auf": "audio/L16;rate=16000",
        "aue": "lame",
        "tte": "utf8",
        "ent": "en_us-ise",
        "category": "read_sentence"
    }
    param_base64 = base64.b64encode(json.dumps(param).encode()).decode()
    checksum = hashlib.md5(f"{api_key}{cur_time}{param_base64}".encode()).hexdigest()

    response = httpx.post(
        "https://ise-api.xfyun.cn/v2/open-ise",
        data={
            "auf": "audio/L16;rate=16000",
            "aue": "lame",
            "engine_type": "en_us-ise",
            "text": reference_text,
            "audio": base64_audio
        },
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Appid": appid,
            "X-CurTime": cur_time,
            "X-Param": param_base64,
            "X-CheckSum": checksum
        }
    )
    return _extract_score(response.json())

def _extract_score(data: dict) -> int:
    result_text = data.get("payload", {}).get("result", {}).get("text")
    if not result_text:
        raise ValueError("No result text in response")
    xml = base64.b64decode(result_text).decode()
    match = re.search(r'total_score="([\d.]+)"', xml)
    if not match:
        raise ValueError("No total_score in XML result")
    return int(decimal.Decimal(match.group(1)).quantize(decimal.Decimal("1"), rounding=decimal.ROUND_HALF_UP))
