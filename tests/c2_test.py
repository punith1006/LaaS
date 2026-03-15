import torch, torch.nn as nn

class MiniModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.layers = nn.Sequential(
            nn.Linear(1024, 2048), nn.ReLU(),
            nn.Linear(2048, 2048), nn.ReLU(),
            nn.Linear(2048, 1024),
        )
    def forward(self, x): return self.layers(x)

model = MiniModel().cuda().half()
batch = torch.randn(64, 1024, device='cuda', dtype=torch.float16)
t = torch.randn(int(2.5*1024**3/4), device='cuda')

print('[C2] Hammering — do NOT stop this')
i = 0
while True:
    with torch.no_grad(): out = model(batch)
    i += 1
    if i % 1000 == 0: print(f'[C2] iter {i}')