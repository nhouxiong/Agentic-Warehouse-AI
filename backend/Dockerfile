FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Generate synthetic data if not present
RUN test -f data/generated/dock_appointments.csv || python data/generate_synthetic_data.py

# Train ML models if not present
RUN test -f core/ml/trained/wait_time_model.pkl || python -c "from core.ml.models import train_all_models; train_all_models()"

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
