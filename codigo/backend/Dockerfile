FROM python:3.12-slim

WORKDIR /app

# Dependencias do sistema:
# - PostGIS/GDAL (geopandas)
# - Pango/Cairo/HarfBuzz (WeasyPrint legado)
# - libs do Chromium (Playwright) - X11/fontes/audio/codec
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev libgdal-dev \
    libpango-1.0-0 libpangoft2-1.0-0 libpangocairo-1.0-0 \
    libharfbuzz0b libfribidi0 libfontconfig1 \
    libgdk-pixbuf-xlib-2.0-0 libcairo2 shared-mime-info \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
    libxrandr2 libgbm1 libasound2 libatspi2.0-0 libpango-1.0-0 \
    fonts-liberation fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Baixa o Chromium usado pelo Playwright (so o chromium, sem firefox/webkit)
RUN playwright install chromium

COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
