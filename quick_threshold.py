# quick_threshold.py
"""
Ước tính ngưỡng cosine cho hệ thống nhận diện admin.
- Đầu vào : server_admins.pt  (templates, labels)
- Đầu ra  : in ra ngưỡng cosine đề xuất  và các thống kê.
"""

import torch
import torch.nn.functional as F
import itertools
import numpy as np
import sys

# ------------------ CONFIG ------------------
PT_FILE  = "server_admins.pt"
PERCENT  = 5          # lấy phân vị thấp nhất PERCENT % (loại outlier quá nhỏ)
MARGIN   = 0.03       # trừ thêm "khoảng đệm" an toàn
# -------------------------------------------

try:
    templates, labels = torch.load(PT_FILE)
except FileNotFoundError:
    sys.exit(f"‼️  Không tìm thấy {PT_FILE}. Hãy chạy build_db.py trước.")

N = len(labels)
if N < 2:
    sys.exit("‼️  Database chỉ có 1 admin – không thể tự tính ngưỡng.")

templates = torch.stack(templates)          # [N, 512]

# --- khoảng cách cosine cho mọi cặp khác người ---
dists = [
    1 - F.cosine_similarity(templates[i], templates[j], dim=0).item()
    for i, j in itertools.combinations(range(N), 2)
]

dists_np = np.array(dists)
p_val    = np.percentile(dists_np, PERCENT)   # phân vị 5 % mặc định
threshold = max(p_val - MARGIN, 0.0)          # không âm

# --- hiển thị kết quả ---
print(f"Số admin (template): {N}")
print(f"Số cặp khác người  : {len(dists)}")
print(f"Khoảng cách cosine (min / mean / max): "
      f"{dists_np.min():.3f} / {dists_np.mean():.3f} / {dists_np.max():.3f}")
print(f"Phân vị {PERCENT}%            : {p_val:.3f}")
print(f"Khoảng đệm (-{MARGIN})        : -{MARGIN}")
print(f"🐱‍👤  Ngưỡng COSINE đề xuất     : {threshold:.3f}")

# Gợi ý tiếp theo cho người dùng
print("\n→ Sao chép giá trị 'ngưỡng cosine đề xuất' vào biến THRESHOLD trong watchdog_cpu.py")
