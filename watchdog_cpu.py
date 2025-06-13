import cv2, torch, time, os, numpy as np, face_alignment
import torch.nn.functional as F
from face_alignment import FaceAlignment, LandmarksType
from facenet_pytorch import InceptionResnetV1
from datetime import datetime

# ─── cấu hình ──────────────────────────────────────────────
THRESHOLD = 0.429        # lấy từ quick_threshold.py
COOLDOWN  = 5
templates, labels = torch.load('server_admins.pt')
templates = torch.stack(templates)           # [N,512] – đã L2-norm

# ─── khởi tạo ──────────────────────────────────────────────
fa       = FaceAlignment(LandmarksType.TWO_D, device='cpu', flip_input=False)
embedder = InceptionResnetV1(pretrained='vggface2').eval()

os.makedirs('intruder', exist_ok=True)
last_alert = 0

def alert(pic):
    global last_alert
    if time.time() - last_alert < COOLDOWN:
        return
    last_alert = time.time()
    ts = datetime.now().strftime('%Y%m%d_%H%M%S')
    cv2.imwrite(f'intruder/{ts}.jpg', pic)
    print('*** INTRUDER', ts)

# ─── hàm crop từ landmark ─────────────────────────────────
def crop_from_landmarks(img_bgr, lms, margin=0.2, size=160):
    x, y, w, h = cv2.boundingRect(lms.astype(np.int32))
    cx, cy = x + w/2, y + h/2
    side   = int(max(w, h) * (1 + margin))
    x1, y1 = int(cx - side/2), int(cy - side/2)
    x2, y2 = x1 + side, y1 + side
    # clamp vào khung hình
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(img_bgr.shape[1], x2), min(img_bgr.shape[0], y2)
    face = img_bgr[y1:y2, x1:x2]
    return cv2.resize(face, (size, size))

# ─── vòng webcam ──────────────────────────────────────────
cap = cv2.VideoCapture(0)
while True:
    ok, frame = cap.read()
    if not ok:
        break

    # ⭐ Chuyển BGR ➜ RGB trước khi tìm landmark
    preds = fa.get_landmarks(frame[..., ::-1])     # <-- sửa ở đây
    if preds is None:
        cv2.imshow('view', frame)
        if cv2.waitKey(1) == 27: break
        continue

    # phần còn lại giữ nguyên
    face = crop_from_landmarks(frame, preds[0])    # BGR 160×160
    rgb  = face[..., ::-1].astype(np.float32) / 255.
    rgb  = (rgb - 0.5) / 0.5
    tensor = torch.tensor(rgb).permute(2,0,1).unsqueeze(0)

    emb = embedder(tensor).squeeze(0)
    dists = 1 - F.cosine_similarity(emb.unsqueeze(0), templates, dim=1)
    dmin, idx = dists.min().item(), int(dists.argmin())

    if dmin <= THRESHOLD:
        cv2.putText(frame, f'OK: {labels[idx]}', (10,30),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0,255,0), 2)
    else:
        cv2.putText(frame, 'INTRUDER', (10,30),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0,0,255), 2)
        alert(frame)

    cv2.imshow('view', frame)
    if cv2.waitKey(1) == 27: break
cap.release(); cv2.destroyAllWindows()
# ─── kết thúc ─────────────────────────────────────────────