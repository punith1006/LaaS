FROM python:3.11-slim-bookworm

WORKDIR /app

# Install Docker SDK for Python
RUN pip install --no-cache-dir docker==7.1.0

# Note: ZFS utils removed - exporter uses 'du' fallback for storage metrics

COPY session_exporter.py .

RUN useradd -m -u 1000 exporter && \
    mkdir -p /app/file_sd && \
    chown -R exporter:exporter /app

USER exporter

EXPOSE 9501

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:9501/health')"

CMD ["python3", "session_exporter.py"]
