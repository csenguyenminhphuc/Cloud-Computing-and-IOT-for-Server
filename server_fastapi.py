import base64, cv2, numpy as np, torch, torch.nn.functional as F
from datetime import datetime
import face_alignment
from face_alignment import LandmarksType
from facenet_pytorch import InceptionResnetV1
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel

# ───────── config ─────────────────────────────────────────
THRESHOLD = 0.429
DB_FILE   = "server_admins.pt"          # file template bạn đã build

templates, labels = torch.load(DB_FILE)
templates = torch.stack(templates)      # [N,512] đã L2-norm

fa = face_alignment.FaceAlignment(
        LandmarksType.TWO_D,
        device="cpu",
        flip_input=False
)
embedder = InceptionResnetV1(pretrained='vggface2').eval()

def crop_face(img, lm, margin=0.2, size=160):
    x,y,w,h = cv2.boundingRect(lm.astype(np.int32))
    cx,cy = x+w/2, y+h/2
    s = int(max(w,h)*(1+margin))
    x1,y1 = max(0,int(cx-s/2)), max(0,int(cy-s/2))
    x2,y2 = min(img.shape[1],x1+s), min(img.shape[0],y1+s)
    return cv2.resize(img[y1:y2, x1:x2], (size,size))

def recognise(img_bytes: bytes):
    img = cv2.imdecode(np.frombuffer(img_bytes,np.uint8), cv2.IMREAD_COLOR)
    if img is None: raise ValueError("decode_failed")

    lms = fa.get_landmarks(img[...,::-1])
    if lms is None: raise ValueError("no_face")

    face = crop_face(img, lms[0])
    rgb  = face[...,::-1].astype(np.float32)/255.
    rgb  = (rgb-0.5)/0.5
    ten  = torch.tensor(rgb).permute(2,0,1).unsqueeze(0)
    emb  = embedder(ten).squeeze(0)

    d = 1 - F.cosine_similarity(emb.unsqueeze(0), templates, dim=1)
    dmin, idx = d.min().item(), int(d.argmin())
    stranger  = dmin > THRESHOLD
    if stranger:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]
        with open(f"intruder/{ts}.jpg", "wb") as f:
            f.write(img_bytes)
            
    return {
        "time":      datetime.now().isoformat()+"Z",
        "distance":  round(dmin,3),
        "stranger":  stranger,
        "label":     None if stranger else labels[idx]
    }

# ───────── FastAPI ────────────────────────────────────────
app = FastAPI(title="ESP32-CAM Face API")

class ImgB64(BaseModel):
    image: str      # base64 chuỗi (có/không data prefix)

@app.post("/predict/file")
async def predict_file(file: UploadFile = File(...)):
    try:
        res = recognise(await file.read())
        return res
    except ValueError as e:
        raise HTTPException(400, str(e))

@app.post("/predict")
def predict_b64(body: ImgB64):
    b64 = body.image.split(",")[-1]
    try:
        res = recognise(base64.b64decode(b64))
        return res
    except Exception:
        raise HTTPException(400, "bad_base64")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="152.42.200.154", port=1111)
