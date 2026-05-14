FROM python:3.10-slim  '//slim est une version allégée de limage Python, ce qui permet de réduire la taille de limage Docker finale.
 Elle contient uniquement les éléments essentiels pour exécuter des applications Python,
ce qui la rend plus rapide à télécharger et à déployer.'

WORKDIR /app
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgl1 \
    wget \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .
RUN mkdir -p uploads/raw

EXPOSE 8001
CMD ["python", "main.py"]