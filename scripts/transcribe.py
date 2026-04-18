import whisper
import sys
import json

audio_path = sys.argv[1]
model = whisper.load_model("base")  
result = model.transcribe(audio_path)
print(json.dumps({
    "text": result["text"]
}))