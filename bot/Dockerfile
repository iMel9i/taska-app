FROM python:3.12-slim

WORKDIR /app

# Копируем только то, что нужно боту
COPY bot/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY bot/main.py .

# Копируем собранную статику фронтенда (Vite положит её сюда при сборке)
COPY frontend/dist ./static

EXPOSE 8000

CMD ["python", "main.py"]