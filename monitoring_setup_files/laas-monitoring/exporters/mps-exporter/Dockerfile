FROM python:3.11-slim-bookworm

WORKDIR /app

# No pip dependencies needed — uses only stdlib
COPY mps_exporter.py .

# Non-root user
RUN useradd -m -u 1000 exporter

USER exporter

EXPOSE 9500

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:9500/health')"

CMD ["python3", "mps_exporter.py"]
