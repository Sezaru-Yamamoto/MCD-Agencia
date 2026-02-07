#!/usr/bin/env bash
# =============================================================================
# Render Build Script for MCD-Agencia Backend
# =============================================================================
# This script runs during Render's build step.
# It installs dependencies, runs migrations, and collects static files.
# =============================================================================

set -o errexit  # Exit on error

echo "=== Installing system dependencies (WeasyPrint, etc.) ==="
apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libcairo2 \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

echo "=== Installing Python dependencies ==="
pip install --upgrade pip
pip install -r requirements.txt

echo "=== Collecting static files ==="
python manage.py collectstatic --noinput

echo "=== Running database migrations ==="
python manage.py migrate --noinput

echo "=== Creating superuser if needed ==="
python manage.py shell -c "
from apps.users.models import User
import os
email = os.getenv('DJANGO_SUPERUSER_EMAIL', '')
password = os.getenv('DJANGO_SUPERUSER_PASSWORD', '')
if email and password:
    if not User.objects.filter(email=email).exists():
        user = User.objects.create_superuser(email=email, password=password)
        user.first_name = 'Admin'
        user.save()
        print(f'Superuser {email} created successfully')
    else:
        print(f'Superuser {email} already exists')
else:
    print('No DJANGO_SUPERUSER_EMAIL/PASSWORD set, skipping superuser creation')
"

echo "=== Build completed successfully ==="
