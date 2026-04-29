import torch, time, torch.nn as nn

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

# Warmup
with torch.no_grad():
    for _ in range(50): out = model(batch)
torch.cuda.synchronize()

# Benchmark — NO per-iteration sync, pure async throughput
print('=== BASELINE ASYNC: C1 ALONE ===')
torch.cuda.synchronize()
start = time.perf_counter()
with torch.no_grad():
    for i in range(500): out = model(batch)
torch.cuda.synchronize()  # only once at the end
elapsed = time.perf_counter() - start

print(f'500 passes in {elapsed:.3f}s')
print(f'Throughput: {500/elapsed:.2f} infer/sec')
print(f'Batch throughput: {500*64/elapsed:.0f} samples/sec')