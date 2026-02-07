"""
Django Cloud Production Settings for MCD-Agencia.

Optimized for FREE cloud hosting with MINIMAL platforms:
  - Render (backend + PostgreSQL)  → 1 platform
  - Vercel (frontend)              → 1 platform

No Redis, no S3, no SendGrid needed. Celery runs synchronously.
Everything works exactly as it does locally, but online.

Usage: Set DJANGO_ENV=cloud in environment variables.
"""

from .base import *

# =============================================================================
# CRITICAL SECURITY VALIDATION
# =============================================================================

if SECRET_KEY == _INSECURE_SECRET_KEY or not SECRET_KEY:
    raise ValueError(
        'CRITICAL: DJANGO_SECRET_KEY must be set to a secure random value. '
        'Generate with: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"'
    )

# =============================================================================
# DEBUG CONFIGURATION
# =============================================================================

DEBUG = False

ALLOWED_HOSTS = [h for h in os.getenv('ALLOWED_HOSTS', '').split(',') if h]

# Render provides a .onrender.com domain — add it automatically
RENDER_EXTERNAL_HOSTNAME = os.getenv('RENDER_EXTERNAL_HOSTNAME', '')
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

if not ALLOWED_HOSTS:
    # Fallback: allow all (safe because Render only routes to your domain)
    ALLOWED_HOSTS = ['*']


# =============================================================================
# SECURITY CONFIGURATION
# =============================================================================

SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Lax'

SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

# CSRF trusted origins (Vercel frontend + Render backend)
CSRF_TRUSTED_ORIGINS = os.getenv('CSRF_TRUSTED_ORIGINS', '').split(',')
CSRF_TRUSTED_ORIGINS = [o for o in CSRF_TRUSTED_ORIGINS if o]


# =============================================================================
# DATABASE (Render PostgreSQL — included free, auto-linked via DATABASE_URL)
# =============================================================================

DATABASE_URL = os.getenv('DATABASE_URL', '')

if DATABASE_URL:
    import dj_database_url
    DATABASES = {
        'default': dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
else:
    # Fallback to individual env vars (DB_NAME, DB_USER, DB_PASSWORD, etc.)
    DATABASES['default']['CONN_MAX_AGE'] = 600


# =============================================================================
# CACHE — In-memory (no Redis needed, zero external dependencies)
# =============================================================================

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'mcd-cloud-cache',
    }
}

# Use database sessions instead of cache (more reliable without Redis)
SESSION_ENGINE = 'django.contrib.sessions.backends.db'


# =============================================================================
# CELERY — Run synchronously (no separate worker on free tier)
# =============================================================================

CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True


# =============================================================================
# FILE STORAGE — Use local/WhiteNoise (no S3 needed initially)
# =============================================================================

DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'

# If S3 is configured, use it
if os.getenv('AWS_ACCESS_KEY_ID') and os.getenv('AWS_STORAGE_BUCKET_NAME'):
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'


# =============================================================================
# STATIC FILES
# =============================================================================

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'


# =============================================================================
# EMAIL — Gmail SMTP (free) or SendGrid
# =============================================================================

if os.getenv('SENDGRID_API_KEY'):
    EMAIL_BACKEND = 'anymail.backends.sendgrid.EmailBackend'
    ANYMAIL = {
        'SENDGRID_API_KEY': os.getenv('SENDGRID_API_KEY'),
    }
elif os.getenv('EMAIL_HOST_USER'):
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
    EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
    EMAIL_USE_TLS = True
    EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
    EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
    DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER)
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'


# =============================================================================
# CORS
# =============================================================================

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = os.getenv('CORS_ALLOWED_ORIGINS', '').split(',')
CORS_ALLOWED_ORIGINS = [o for o in CORS_ALLOWED_ORIGINS if o]


# =============================================================================
# LOGGING
# =============================================================================

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}


# =============================================================================
# SENTRY (Optional — free tier available)
# =============================================================================

SENTRY_DSN = os.getenv('SENTRY_DSN', '')
if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration()],
        environment='cloud',
        traces_sample_rate=0.05,
        send_default_pii=False,
    )


# =============================================================================
# REST FRAMEWORK
# =============================================================================

REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
    'anon': '100/hour',
    'user': '1000/hour',
    'rfq': '3/hour',
}

REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'] = [
    'rest_framework.renderers.JSONRenderer',
]


# =============================================================================
# JWT
# =============================================================================

from datetime import timedelta as _td
SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'] = _td(minutes=30)
SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'] = _td(days=3)


# =============================================================================
# ALLAUTH
# =============================================================================

ACCOUNT_EMAIL_VERIFICATION = 'optional'


# =============================================================================
# PAYMENT GATEWAYS — Optional (don't crash if not configured)
# =============================================================================

PAYPAL_MODE = 'sandbox' if not os.getenv('PAYPAL_CLIENT_SECRET') else 'live'
