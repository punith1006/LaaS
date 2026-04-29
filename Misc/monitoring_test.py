import requests

# Get GPU temperature
response = requests.get(
    "http://100.100.66.101:9090/api/v1/query",
    params={"query": "DCGM_FI_DEV_GPU_TEMP"}
)
gpu_temp = response.json()["data"]["result"][0]["value"][1]

# Get active sessions
response = requests.get(
    "http://100.100.66.101:9090/api/v1/query",
    params={"query": "laas_active_sessions_total"}
)
sessions = response.json()["data"]["result"]

print(gpu_temp, sessions)