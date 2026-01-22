"""
Core URL Configuration.

This module provides health check and utility endpoints.
"""

from django.urls import path

from .views import HealthCheckView

urlpatterns = [
    path('', HealthCheckView.as_view(), name='health-check'),
]
