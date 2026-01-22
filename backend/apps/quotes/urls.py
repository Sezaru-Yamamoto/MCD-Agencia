"""
Quote URLs for MCD-Agencia.

This module provides URL routing for quote endpoints:
    - Quote requests (public and admin)
    - Quotes management
    - Public quote viewing
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    QuoteRequestPublicView,
    QuoteRequestViewSet,
    QuoteViewSet,
    QuotePublicView,
)

app_name = 'quotes'

router = DefaultRouter()
router.register('requests', QuoteRequestViewSet, basename='requests')
router.register('', QuoteViewSet, basename='quotes')

urlpatterns = [
    # Public endpoints
    path('request/', QuoteRequestPublicView.as_view(), name='request_public'),
    path('view/<uuid:token>/', QuotePublicView.as_view(), name='view_public'),

    # ViewSets
    path('', include(router.urls)),
]
