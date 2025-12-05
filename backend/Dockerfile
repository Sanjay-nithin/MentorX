# FastAPI app Dockerfile
# Build a lightweight image suitable for production

FROM python:3.11-slim

# Prevent python from writing .pyc files and enable unbuffered stdout
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install system dependencies (if needed for building wheels)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set workdir
WORKDIR /app

# Copy requirements and install
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r /app/requirements.txt

# Copy application source
COPY . /app

# Expose port
EXPOSE 8000

# Default envs (override at runtime)
ENV PORT=8000 \
    HOST=0.0.0.0

# Start the FastAPI app
# Assuming app.py defines `app = FastAPI()` at the project root
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
