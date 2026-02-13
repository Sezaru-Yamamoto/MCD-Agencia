"""
Core Views for MCD-Agencia.

This module provides utility views such as health checks.
"""

import subprocess

from django.conf import settings
from django.db import connection
from django.core.cache import cache
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


def _get_git_commit():
    """Get current git commit hash (short)."""
    try:
        return subprocess.check_output(
            ['git', 'rev-parse', '--short', 'HEAD'],
            stderr=subprocess.DEVNULL,
            timeout=5,
        ).decode().strip()
    except Exception:
        return 'unknown'


GIT_COMMIT = _get_git_commit()


class HealthCheckView(APIView):
    """
    Health check endpoint for monitoring and load balancers.

    Returns the current health status of the application including:
        - Database connectivity
        - Cache connectivity
        - Application version

    This endpoint is public and doesn't require authentication.

    Response format:
        {
            "status": "healthy",
            "version": "1.0.0",
            "checks": {
                "database": "ok",
                "cache": "ok"
            }
        }
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        """
        Perform health checks and return status.

        Returns:
            200 OK if all checks pass
            503 Service Unavailable if any check fails
        """
        checks = {}
        is_healthy = True

        # Check database connection
        try:
            connection.ensure_connection()
            checks['database'] = 'ok'
        except Exception as e:
            checks['database'] = f'error: {str(e)}'
            is_healthy = False

        # Check cache connection
        try:
            cache.set('health_check', 'ok', 1)
            if cache.get('health_check') == 'ok':
                checks['cache'] = 'ok'
            else:
                checks['cache'] = 'error: cache not responding'
                is_healthy = False
        except Exception as e:
            checks['cache'] = f'error: {str(e)}'
            is_healthy = False

        response_data = {
            'status': 'healthy' if is_healthy else 'unhealthy',
            'version': '1.0.0',
            'commit': GIT_COMMIT,
            'environment': 'production' if not settings.DEBUG else 'development',
            'checks': checks,
        }

        status_code = status.HTTP_200_OK if is_healthy else status.HTTP_503_SERVICE_UNAVAILABLE

        return Response(response_data, status=status_code)
