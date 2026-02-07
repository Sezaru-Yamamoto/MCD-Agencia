"""
User Views for MCD-Agencia.

This module provides ViewSets and views for user operations:
    - User registration and authentication
    - Profile management
    - Role management (admin)
    - Fiscal data management
    - Consent tracking
    - OAuth authentication (Google)
"""

from django.conf import settings
from django.contrib.auth import get_user_model
from django.shortcuts import redirect
from django.utils.translation import gettext_lazy as _
from rest_framework import status, viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from urllib.parse import urlencode

from apps.audit.models import AuditLog
from apps.core.pagination import StandardResultsSetPagination
from .models import Role, UserConsent, FiscalData
from .tasks import send_verification_email
from .serializers import (
    UserRegistrationSerializer,
    UserSerializer,
    UserUpdateSerializer,
    ChangePasswordSerializer,
    RoleSerializer,
    UserConsentSerializer,
    FiscalDataSerializer,
    UserAdminSerializer,
)

User = get_user_model()


class UserRegistrationView(APIView):
    """
    Handle user registration.

    POST /api/v1/auth/register/
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        """Register a new user."""
        serializer = UserRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Create consent records
        UserConsent.objects.create(
            user=user,
            document_type='terms',
            document_version='1.0',
            ip_address=self._get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
            method='registration_form'
        )
        UserConsent.objects.create(
            user=user,
            document_type='privacy',
            document_version='1.0',
            ip_address=self._get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
            method='registration_form'
        )

        # Log registration
        AuditLog.log(
            entity=user,
            action=AuditLog.ACTION_CREATED,
            actor=user,
            request=request,
            metadata={'source': 'registration'}
        )

        # Send verification email asynchronously
        send_verification_email.delay(str(user.id))

        return Response(
            {
                'message': _('Registration successful. Please verify your email.'),
                'user': UserSerializer(user).data
            },
            status=status.HTTP_201_CREATED
        )

    def _get_client_ip(self, request):
        """Get client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')


class UserProfileView(APIView):
    """
    Handle user profile operations.

    GET /api/v1/users/me/
    PATCH /api/v1/users/me/
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get current user profile."""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        """Update current user profile."""
        serializer = UserUpdateSerializer(
            request.user,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)

        # Store before state for audit
        before_state = UserSerializer(request.user).data

        serializer.save()

        # Log profile update
        AuditLog.log(
            entity=request.user,
            action=AuditLog.ACTION_UPDATED,
            actor=request.user,
            before_state=before_state,
            after_state=UserSerializer(request.user).data,
            request=request
        )

        return Response(UserSerializer(request.user).data)


class ChangePasswordView(APIView):
    """
    Handle password change.

    POST /api/v1/users/change-password/
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Change user password."""
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save(update_fields=['password', 'updated_at'])

        # Log password change
        AuditLog.log(
            entity=request.user,
            action=AuditLog.ACTION_PASSWORD_CHANGED,
            actor=request.user,
            request=request
        )

        return Response({'message': _('Password changed successfully.')})


class RoleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for role management (admin only).

    GET /api/v1/users/roles/
    POST /api/v1/users/roles/
    GET /api/v1/users/roles/{id}/
    PUT /api/v1/users/roles/{id}/
    DELETE /api/v1/users/roles/{id}/
    """

    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = StandardResultsSetPagination

    def perform_create(self, serializer):
        """Log role creation."""
        role = serializer.save()
        AuditLog.log(
            entity=role,
            action=AuditLog.ACTION_CREATED,
            actor=self.request.user,
            after_state=RoleSerializer(role).data,
            request=self.request
        )

    def perform_update(self, serializer):
        """Log role update."""
        before_state = RoleSerializer(self.get_object()).data
        role = serializer.save()
        AuditLog.log(
            entity=role,
            action=AuditLog.ACTION_UPDATED,
            actor=self.request.user,
            before_state=before_state,
            after_state=RoleSerializer(role).data,
            request=self.request
        )

    def perform_destroy(self, instance):
        """Log role deletion."""
        AuditLog.log(
            entity=instance,
            action=AuditLog.ACTION_DELETED,
            actor=self.request.user,
            before_state=RoleSerializer(instance).data,
            request=self.request
        )
        instance.delete()


class UserConsentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for user consent management.

    GET /api/v1/users/consents/
    POST /api/v1/users/consents/
    """

    serializer_class = UserConsentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Return consents for current user."""
        return UserConsent.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        """Create consent with user and request metadata."""
        serializer.save(
            user=self.request.user,
            ip_address=self._get_client_ip(),
            user_agent=self.request.META.get('HTTP_USER_AGENT', '')[:500]
        )

    def _get_client_ip(self):
        """Get client IP address."""
        x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return self.request.META.get('REMOTE_ADDR')

    @action(detail=True, methods=['post'])
    def revoke(self, request, pk=None):
        """Revoke a consent."""
        from django.utils import timezone
        consent = self.get_object()
        consent.revoked_at = timezone.now()
        consent.save(update_fields=['revoked_at', 'updated_at'])
        return Response({'message': _('Consent revoked.')})


class FiscalDataViewSet(viewsets.ModelViewSet):
    """
    ViewSet for fiscal data management.

    GET /api/v1/users/fiscal-data/
    POST /api/v1/users/fiscal-data/
    PUT /api/v1/users/fiscal-data/{id}/
    DELETE /api/v1/users/fiscal-data/{id}/
    """

    serializer_class = FiscalDataSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        """Return fiscal data for current user."""
        return FiscalData.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        """Create fiscal data for current user."""
        fiscal_data = serializer.save(user=self.request.user)

        # If marked as default, unset other defaults
        if fiscal_data.is_default:
            FiscalData.objects.filter(
                user=self.request.user, is_default=True
            ).exclude(id=fiscal_data.id).update(is_default=False)

    def perform_update(self, serializer):
        """Update fiscal data."""
        fiscal_data = serializer.save()

        # If marked as default, unset other defaults
        if fiscal_data.is_default:
            FiscalData.objects.filter(
                user=self.request.user, is_default=True
            ).exclude(id=fiscal_data.id).update(is_default=False)

    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        """Set fiscal data as default."""
        fiscal_data = self.get_object()
        FiscalData.objects.filter(
            user=request.user, is_default=True
        ).update(is_default=False)
        fiscal_data.is_default = True
        fiscal_data.save(update_fields=['is_default', 'updated_at'])
        return Response(FiscalDataSerializer(fiscal_data).data)


class UserAdminViewSet(viewsets.ModelViewSet):
    """
    Admin ViewSet for user management.

    GET /api/v1/admin/users/
    GET /api/v1/admin/users/{id}/
    PUT /api/v1/admin/users/{id}/
    DELETE /api/v1/admin/users/{id}/
    """

    queryset = User.objects.all()
    serializer_class = UserAdminSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = StandardResultsSetPagination
    filterset_fields = ['role', 'is_active', 'is_staff', 'is_email_verified']
    search_fields = ['email', 'first_name', 'last_name', 'phone']
    ordering_fields = ['created_at', 'last_login', 'email']
    ordering = ['-created_at']

    def perform_update(self, serializer):
        """Log user update by admin."""
        before_state = UserAdminSerializer(self.get_object()).data
        user = serializer.save()
        AuditLog.log(
            entity=user,
            action=AuditLog.ACTION_UPDATED,
            actor=self.request.user,
            before_state=before_state,
            after_state=UserAdminSerializer(user).data,
            request=self.request,
            metadata={'admin_action': True}
        )

    def perform_destroy(self, instance):
        """Soft delete user."""
        AuditLog.log(
            entity=instance,
            action=AuditLog.ACTION_DELETED,
            actor=self.request.user,
            before_state=UserAdminSerializer(instance).data,
            request=self.request,
            metadata={'admin_action': True}
        )
        instance.soft_delete()

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a user account."""
        user = self.get_object()
        user.is_active = True
        user.save(update_fields=['is_active', 'updated_at'])

        AuditLog.log(
            entity=user,
            action=AuditLog.ACTION_STATE_CHANGED,
            actor=request.user,
            request=request,
            metadata={'action': 'activate'}
        )

        return Response({'message': _('User activated.')})

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate a user account."""
        user = self.get_object()
        user.is_active = False
        user.save(update_fields=['is_active', 'updated_at'])

        AuditLog.log(
            entity=user,
            action=AuditLog.ACTION_STATE_CHANGED,
            actor=request.user,
            request=request,
            metadata={'action': 'deactivate'}
        )

        return Response({'message': _('User deactivated.')})

    @action(detail=True, methods=['post'])
    def change_role(self, request, pk=None):
        """Change user role."""
        user = self.get_object()
        role_id = request.data.get('role_id')

        if not role_id:
            return Response(
                {'error': _('role_id is required.')},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            role = Role.objects.get(id=role_id)
        except Role.DoesNotExist:
            return Response(
                {'error': _('Role not found.')},
                status=status.HTTP_404_NOT_FOUND
            )

        old_role = user.role
        user.role = role
        user.save(update_fields=['role', 'updated_at'])

        AuditLog.log(
            entity=user,
            action=AuditLog.ACTION_PERMISSION_CHANGED,
            actor=request.user,
            before_state={'role': str(old_role.id) if old_role else None},
            after_state={'role': str(role.id)},
            request=request
        )

        return Response(UserAdminSerializer(user).data)


class SalesRepsView(APIView):
    """
    Get list of available sales representatives.

    GET /api/v1/users/sales-reps/
    """

    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        """Get list of sales reps for assignment."""
        sales_role = Role.objects.filter(name='sales').first()

        if not sales_role:
            return Response([])

        sales_reps = User.objects.filter(
            role=sales_role,
            is_active=True,
            receives_auto_assignments=True
        ).order_by('first_name', 'last_name')

        data = [
            {
                'id': str(rep.id),
                'full_name': rep.full_name,
                'email': rep.email,
                'current_load': rep.current_load,
                'max_load': rep.max_load,
            }
            for rep in sales_reps
        ]

        return Response(data)


class GoogleOAuthCallbackView(APIView):
    """
    Handle Google OAuth callback and redirect to frontend with JWT tokens.

    This view is called after successful Google authentication.
    It generates JWT tokens and redirects to the frontend with tokens in URL params.
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """Handle OAuth callback after Google authentication."""
        import logging
        logger = logging.getLogger(__name__)

        # Check if user is authenticated via allauth
        if not request.user.is_authenticated:
            # Redirect to frontend with error
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
            error_params = urlencode({'error': 'authentication_failed'})
            logger.warning("OAuth callback: User not authenticated, redirecting with error")
            return redirect(f'{frontend_url}/auth/callback?{error_params}')

        user = request.user
        logger.info(f"OAuth callback: User authenticated (id={user.id})")

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        # Log OAuth login
        try:
            AuditLog.log(
                entity=user,
                action=AuditLog.ACTION_LOGIN,
                actor=user,
                request=request,
                metadata={'provider': 'google', 'oauth': True}
            )
        except Exception as e:
            logger.error(f"OAuth callback: Failed to log audit entry: {type(e).__name__}")
            pass  # Don't fail if audit logging fails

        # Logout from Django session (we're using JWT for auth)
        from django.contrib.auth import logout
        logout(request)

        # Redirect to frontend with tokens
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        params = urlencode({
            'access': access_token,
            'refresh': refresh_token,
        })

        redirect_url = f'{frontend_url}/auth/callback?{params}'
        logger.info(f"OAuth callback: Redirecting user (id={user.id}) to frontend")

        return redirect(redirect_url)

