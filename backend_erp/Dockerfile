FROM python:3.9-slim

WORKDIR /app

# Install explicit system dependencies if needed (none strictly needed for pure requests)
# Copy requirements separately to cache dependency map
COPY requirements.txt .

# Requests is required for seeding script
RUN pip install --no-cache-dir -r requirements.txt requests

# Add the rest of the backend files
COPY . .

# Expose backend API port
EXPOSE 8000

# Run the seeding script FIRST before kicking off the server
# using shell execution via CMD 
CMD ["sh", "-c", "python seed_erpnext.py && uvicorn main:app --host 0.0.0.0 --port 8000"]
