"""
Authentication URLs for MCD-Agencia.

This module provides URL routing for authentication endpoints:
    - JWT token obtain/refresh
    - User registration
    - Password reset
    - OAuth callbacks
"""

from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

from ..views import UserRegistrationView, GoogleOAuthCallbackView

app_name = 'auth'

urlpatterns = [
    # JWT Token endpoints
    path('token/', TokenObtainPairView.as_view(), name='token_obtain'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),

    # Registration
    path('register/', UserRegistrationView.as_view(), name='register'),

    # OAuth callbacks
    path('google/callback/', GoogleOAuthCallbackView.as_view(), name='google_callback'),

    # Password reset (placeholder for future implementation)
    # path('password-reset/', PasswordResetView.as_view(), name='password_reset'),
    # path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
]
