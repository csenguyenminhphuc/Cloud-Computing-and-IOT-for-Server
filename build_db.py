import os, glob, cv2, torch, numpy as np
from collections import defaultdict
import face_alignment
from face_alignment import LandmarksType
from facenet_pytorch import InceptionResnetV1
from tqdm import tqdm                           # ⭐ NEW

# ───── khởi tạo ─────────────────────────────────────────────
fa       = face_alignment.FaceAlignment(LandmarksType.TWO_D,
                                        device='cpu', flip_input=False)
embedder = InceptionResnetV1(pretrained='vggface2').eval()

def crop_from_landmarks(img_bgr, lms, margin=0.2, size=160):
    x, y, w, h = cv2.boundingRect(lms.astype(np.int32))
    cx, cy = x + w / 2, y + h / 2
    side   = int(max(w, h) * (1 + margin))
    x1, y1 = int(cx - side / 2), int(cy - side / 2)
    x2, y2 = x1 + side, y1 + side
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(img_bgr.shape[1], x2), min(img_bgr.shape[0], y2)
    face   = img_bgr[y1:y2, x1:x2]
    return cv2.resize(face, (size, size))

person_embeds = defaultdict(list)

# ───── quét thư mục với tqdm ───────────────────────────────
people_dirs = glob.glob('server_face_db/*')
for person_dir in tqdm(people_dirs, desc='People', colour='cyan'):
    label = os.path.basename(person_dir)
    img_paths = glob.glob(f'{person_dir}/*')
    
    for img_path in tqdm(img_paths,
                         desc=f'{label:>10}',
                         leave=False,
                         colour='green'):
        img_bgr = cv2.imread(img_path)
        if img_bgr is None:
            continue

        # BGR -> RGB cho face-alignment
        lms = fa.get_landmarks(img_bgr[..., ::-1])
        if lms is None:
            continue

        face = crop_from_landmarks(img_bgr, lms[0])          # BGR
        rgb  = face[..., ::-1].astype(np.float32) / 255.
        rgb  = (rgb - 0.5) / 0.5                             # [-1,1]
        tensor = torch.tensor(rgb).permute(2, 0, 1).unsqueeze(0)

        emb = embedder(tensor).squeeze(0)                    # L2-norm sẵn
        person_embeds[label].append(emb)

# ───── template trung bình ─────────────────────────────────
templates, labels = [], []
for label, lst in person_embeds.items():
    if not lst:
        print(f'⚠️  {label}: 0 ảnh hợp lệ'); continue
    tpl = torch.stack(lst).mean(0)
    templates.append(tpl / tpl.norm())
    labels.append(label)
    print(f'✓ {label}: {len(lst)} ảnh → template')

torch.save((templates, labels), 'server_admins.pt')
print(f'🏁 Đã lưu {len(labels)} template → server_admins.pt')
