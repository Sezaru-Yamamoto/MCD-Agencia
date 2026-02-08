"""
URL Configuration for MCD-Agencia Backend.

This module defines the URL routing for the entire Django application.
All API endpoints are prefixed with /api/v1/ for versioning.

URL Structure:
    /api/v1/auth/          - Authentication endpoints (login, register, OAuth)
    /api/v1/users/         - User management endpoints
    /api/v1/catalog/       - Product and service catalog endpoints
    /api/v1/orders/        - Order management endpoints
    /api/v1/quotes/        - Quotation (RFQ) endpoints
    /api/v1/inventory/     - Inventory management endpoints
    /api/v1/content/       - CMS content endpoints (landing page, etc.)
    /api/v1/payments/      - Payment processing endpoints
    /api/v1/webhooks/      - Webhook endpoints for external services
    /api/v1/chatbot/       - Chatbot and lead capture endpoints
    /api/docs/             - API documentation (Swagger/ReDoc)
    /admin/                - Django admin interface

For more information on Django URL dispatching, see:
https://docs.djangoproject.com/en/5.0/topics/http/urls/
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from django.http import HttpResponseRedirect, JsonResponse
from django.views.static import serve as media_serve
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)


def redirect_to_frontend(request):
    """Redirect root URL to frontend."""
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    return HttpResponseRedirect(f'{frontend_url}/es')


def storage_debug(request):
    """Temporary endpoint to debug storage configuration. Remove after fixing."""
    from django.core.files.storage import default_storage
    
    # Force initialization of the lazy storage proxy
    try:
        default_storage.exists('__probe__')
    except Exception:
        pass
    
    # Access the real storage object
    storage = default_storage
    # In Django 4.2+, DefaultStorage wraps the real backend
    real = storage
    if hasattr(storage, '_wrapped'):
        real = storage._wrapped
    
    result = {
        'storage_repr': repr(storage),
        'real_repr': repr(real),
        'real_class': type(real).__name__,
        'real_module': type(real).__module__,
    }
    
    # Check S3 specific attributes on the real storage
    for attr in ['querystring_auth', 'querystring_expire', 'custom_domain',
                 'endpoint_url', 'bucket_name', 'default_acl', 'url_protocol',
                 'access_key', 'file_overwrite']:
        val = getattr(real, attr, '__MISSING__')
        if attr == 'access_key' and val != '__MISSING__':
            val = val[:6] + '...' if val else val  # Redact
        result[f'storage.{attr}'] = val
    
    result['settings.AWS_QUERYSTRING_AUTH'] = getattr(settings, 'AWS_QUERYSTRING_AUTH', 'NOT SET')
    result['settings.DEFAULT_FILE_STORAGE'] = getattr(settings, 'DEFAULT_FILE_STORAGE', 'NOT SET')
    
    # Check if STORAGES dict exists and what it says
    storages_dict = getattr(settings, 'STORAGES', {})
    if storages_dict:
        result['settings.STORAGES.default'] = str(storages_dict.get('default', 'NOT SET'))
    
    # Generate a URL from an actual file
    from apps.content.models import CarouselSlide
    slide = CarouselSlide.objects.filter(image__isnull=False).exclude(image='').first()
    if slide and slide.image:
        result['file.name'] = slide.image.name
        result['file.storage_class'] = type(slide.image.storage).__name__
        result['file.storage_module'] = type(slide.image.storage).__module__
        # Check storage attributes on the FILE's storage (might differ from default_storage)
        fs = slide.image.storage
        result['file.storage.querystring_auth'] = getattr(fs, 'querystring_auth', '__MISSING__')
        result['file.storage.custom_domain'] = getattr(fs, 'custom_domain', '__MISSING__')
        try:
            url = slide.image.url
            result['file.url'] = url[:200]
            result['url_has_signature'] = '?X-Amz' in url
        except Exception as e:
            result['file.url_error'] = str(e)
    
    return JsonResponse(result)

# =============================================================================
# API VERSION 1 URL PATTERNS
# =============================================================================

api_v1_patterns = [
    # Authentication & Users
    path('auth/', include('apps.users.urls.auth_urls')),
    path('users/', include('apps.users.urls.user_urls')),

    # Catalog (Products & Services)
    path('catalog/', include('apps.catalog.urls')),

    # Orders & E-commerce
    path('orders/', include('apps.orders.urls')),

    # Quotations (RFQ)
    path('quotes/', include('apps.quotes.urls')),

    # Inventory
    path('inventory/', include('apps.inventory.urls')),

    # CMS Content (Landing page, FAQ, etc.)
    path('content/', include('apps.content.urls')),

    # Payments & Webhooks
    path('payments/', include('apps.payments.urls')),

    # Chatbot & Leads
    path('chatbot/', include('apps.chatbot.urls')),

    # Audit Log
    path('audit/', include('apps.audit.urls')),
]


# =============================================================================
# ADMIN API URL PATTERNS
# =============================================================================

# Import admin-specific URL patterns
from apps.users.urls import admin_urlpatterns as users_admin_urlpatterns
from apps.orders.urls import admin_urlpatterns as orders_admin_urlpatterns
from apps.payments.urls import admin_urlpatterns as payments_admin_urlpatterns

api_admin_patterns = [
    # Admin user management
    path('users/', include((users_admin_urlpatterns, 'admin-users'))),

    # Admin order management
    path('orders/', include((orders_admin_urlpatterns, 'admin-orders'))),

    # Admin payment management
    path('payments/', include((payments_admin_urlpatterns, 'admin-payments'))),

    # Admin quote requests
    path('quote-requests/', include('apps.quotes.urls', namespace='admin-quotes')),
]


# =============================================================================
# API DOCUMENTATION URL PATTERNS
# =============================================================================

# In production, API docs require staff authentication
if settings.DEBUG:
    docs_patterns = [
        path('schema/', SpectacularAPIView.as_view(), name='schema'),
        path('swagger/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
        path('redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    ]
else:
    from rest_framework.permissions import IsAdminUser
    docs_patterns = [
        path('schema/', SpectacularAPIView.as_view(permission_classes=[IsAdminUser]), name='schema'),
        path('swagger/', SpectacularSwaggerView.as_view(url_name='schema', permission_classes=[IsAdminUser]), name='swagger-ui'),
        path('redoc/', SpectacularRedocView.as_view(url_name='schema', permission_classes=[IsAdminUser]), name='redoc'),
    ]


# =============================================================================
# MAIN URL PATTERNS
# =============================================================================

urlpatterns = [
    # Root URL - redirect to frontend
    path('', redirect_to_frontend, name='root'),

    # Django Admin
    path('admin/', admin.site.urls),

    # Django-allauth (OAuth, email verification, etc.)
    path('accounts/', include('allauth.urls')),

    # API v1
    path('api/v1/', include(api_v1_patterns)),

    # Admin API (requires staff permissions)
    path('api/v1/admin/', include(api_admin_patterns)),

    # API Documentation
    path('api/docs/', include(docs_patterns)),

    # Health check endpoint
    path('health/', include('apps.core.urls')),

    # Temporary storage debug endpoint (remove after fixing R2)
    path('api/v1/debug/storage/', storage_debug),

    # Serve user-uploaded media files (images, etc.)
    # In production without S3, Django serves them directly.
    # When S3/Cloudinary is configured, this route is unused.
    re_path(
        r'^media/(?P<path>.*)$',
        media_serve,
        {'document_root': settings.MEDIA_ROOT},
        name='media',
    ),
]


# =============================================================================
# DEVELOPMENT-ONLY URL PATTERNS
# =============================================================================

if settings.DEBUG:

    # Django Debug Toolbar
    if 'debug_toolbar' in settings.INSTALLED_APPS:
        import debug_toolbar
        urlpatterns = [
            path('__debug__/', include(debug_toolbar.urls)),
        ] + urlpatterns


# =============================================================================
# ADMIN SITE CONFIGURATION
# =============================================================================

admin.site.site_header = 'MCD-Agencia Admin'
admin.site.site_title = 'MCD-Agencia'
admin.site.index_title = 'Panel de Administración'
