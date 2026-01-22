"""
User URLs for MCD-Agencia.

This module provides URL routing for user endpoints:
    - Profile management
    - Fiscal data
    - Consents
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from ..views import (
    UserProfileView,
    ChangePasswordView,
    RoleViewSet,
    UserConsentViewSet,
    FiscalDataViewSet,
    UserAdminViewSet,
)

app_name = 'users'

router = DefaultRouter()
router.register('roles', RoleViewSet, basename='roles')
router.register('consents', UserConsentViewSet, basename='consents')
router.register('fiscal-data', FiscalDataViewSet, basename='fiscal-data')

urlpatterns = [
    # Profile
    path('me/', UserProfileView.as_view(), name='profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),

    # ViewSets
    path('', include(router.urls)),
]


# Admin URLs (to be included separately)
admin_router = DefaultRouter()
admin_router.register('', UserAdminViewSet, basename='admin-users')

admin_urlpatterns = [
    path('', include(admin_router.urls)),
]
