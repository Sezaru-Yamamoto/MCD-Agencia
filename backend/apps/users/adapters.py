"""
Custom Allauth Adapters for MCD-Agencia.

This module provides custom adapters for django-allauth to handle
OAuth authentication flow with JWT tokens for the SPA frontend.
"""

from django.conf import settings
from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter


class CustomAccountAdapter(DefaultAccountAdapter):
    """
    Custom account adapter to handle redirects to frontend.
    """

    def get_login_redirect_url(self, request):
        """
        Always redirect to our JWT callback endpoint after login.
        Store the original 'next' URL in session for later use.
        """
        # Get the next parameter from various sources
        next_url = (
            request.GET.get('next') or 
            request.POST.get('next') or 
            request.session.get('next') or
            request.session.get('socialaccount_state', (None, None))[1] if isinstance(request.session.get('socialaccount_state'), tuple) else None or
            '/'
        )
        
        # Store it in session for the callback view to use
        request.session['oauth_next'] = next_url
        request.session.modified = True
        
        # Always redirect to our JWT callback
        return '/api/v1/auth/google/callback/'


class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    """
    Custom social account adapter to handle OAuth signups and redirects.
    """

    def pre_social_login(self, request, sociallogin):
        """
        Called before the social login is processed.
        Store the next URL from the state.
        """
        # Try to get next URL from the original request state
        state = request.session.get('socialaccount_state')
        if state and isinstance(state, tuple) and len(state) > 1:
            next_url = state[1]
            if next_url:
                request.session['oauth_next'] = next_url
                request.session.modified = True

    def get_login_redirect_url(self, request):
        """
        Always redirect to our JWT callback endpoint after OAuth login.
        """
        return '/api/v1/auth/google/callback/'

    def get_connect_redirect_url(self, request, socialaccount):
        """
        Redirect after connecting a social account.
        """
        return '/api/v1/auth/google/callback/'

    def populate_user(self, request, sociallogin, data):
        """
        Populate user data from social account.
        """
        user = super().populate_user(request, sociallogin, data)
        
        # Set first_name and last_name from OAuth data
        if not user.first_name and data.get('first_name'):
            user.first_name = data.get('first_name', '')
        if not user.last_name and data.get('last_name'):
            user.last_name = data.get('last_name', '')
            
        return user

    def save_user(self, request, sociallogin, form=None):
        """
        Save user and mark email as verified for OAuth users.
        """
        user = super().save_user(request, sociallogin, form)
        
        # Mark email as verified for OAuth users since Google verified it
        user.is_email_verified = True
        user.save(update_fields=['is_email_verified'])
        
        return user
        
        return user
