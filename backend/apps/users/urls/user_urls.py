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
    UserAddressViewSet,
    UserAdminViewSet,
    SalesRepsView,
)

app_name = 'users'

router = DefaultRouter()
router.register('roles', RoleViewSet, basename='roles')
router.register('consents', UserConsentViewSet, basename='consents')
router.register('fiscal-data', FiscalDataViewSet, basename='fiscal-data')
router.register('addresses', UserAddressViewSet, basename='addresses')

urlpatterns = [
    # Profile
    path('me/', UserProfileView.as_view(), name='profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),

    # Sales Reps (for quote assignment)
    path('sales-reps/', SalesRepsView.as_view(), name='sales_reps'),

    # ViewSets
    path('', include(router.urls)),
]


# Admin URLs (to be included separately)
admin_router = DefaultRouter()
admin_router.register('', UserAdminViewSet, basename='admin-users')

admin_urlpatterns = [
    path('', include(admin_router.urls)),
    # Explicit paths for custom actions (fallback if router doesn't generate them)
    path('create_with_password/', UserAdminViewSet.as_view({'post': 'create_with_password'}), name='admin-users-create-with-password'),
    path('<str:pk>/assign_group/', UserAdminViewSet.as_view({'post': 'assign_group'}), name='admin-users-assign-group'),
]
