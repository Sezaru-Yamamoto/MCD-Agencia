"""
Rate limiting for chatbot endpoints.

Protects the Gemini API quota and prevents abuse.
Uses Django cache backend for IP-based throttling.
"""

from rest_framework.throttling import AnonRateThrottle


class ChatMessageThrottle(AnonRateThrottle):
    """
    Throttle for chat messages — limits per IP.

    Default: 30 messages per minute (adjustable via settings).
    This protects the Gemini free-tier quota (15 RPM per key)
    while allowing reasonable usage across multiple users.
    """

    rate = '30/minute'
    scope = 'chat_message'

    def get_cache_key(self, request, view):
        """Use IP + session_id for more granular control."""
        ident = self.get_ident(request)
        session_id = request.data.get('session_id', '')
        return self.cache_format % {
            'scope': self.scope,
            'ident': f'{ident}_{session_id[:20]}',
        }


class ChatConfigThrottle(AnonRateThrottle):
    """
    Throttle for chat config endpoint.

    Lighter limit since config is cached and cheap.
    """

    rate = '60/minute'
    scope = 'chat_config'
