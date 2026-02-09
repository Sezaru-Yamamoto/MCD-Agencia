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
from django.db import transaction
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

        # Atomic: if anything fails inside, user + consents are rolled back
        with transaction.atomic():
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

        # ---- Outside the transaction: side-effects that must NOT roll back ----

        # Send verification email asynchronously
        try:
            send_verification_email.delay(str(user.id))
        except Exception as exc:
            import logging, traceback
            logging.getLogger(__name__).error(
                f"Failed to send verification email to {user.email}: "
                f"{type(exc).__name__}: {exc}\n{traceback.format_exc()}"
            )

        # In-app notification to admins: new user registered
        try:
            from apps.notifications.models import Notification
            Notification.notify_admins(
                notification_type=Notification.TYPE_NEW_USER,
                title='Nuevo usuario registrado',
                message=f'{user.full_name} ({user.email})',
                entity_type='User',
                entity_id=user.id,
                action_url=f'/dashboard/clientes',
            )
        except Exception:
            pass

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


class VerifyEmailView(APIView):
    """
    Verify a user's email address via signed token.

    POST /api/v1/auth/verify-email/
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response(
                {'error': _('Verification token is required.')},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.verify_email_token(token)
        if user is None:
            return Response(
                {'error': _('Invalid or expired verification link.')},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user.is_email_verified:
            return Response({'message': _('Email already verified.')})

        user.is_email_verified = True
        user.save(update_fields=['is_email_verified', 'updated_at'])

        return Response({'message': _('Email verified successfully.')})


class ResendVerificationView(APIView):
    """
    Resend email verification link.

    POST /api/v1/auth/resend-verification/
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response(
                {'error': _('Email address is required.')},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(email=email, is_email_verified=False)
            try:
                send_verification_email.delay(str(user.id))
            except Exception as exc:
                import logging, traceback
                logging.getLogger(__name__).error(
                    f"Failed to send verification email to {email}: "
                    f"{type(exc).__name__}: {exc}\n{traceback.format_exc()}"
                )
        except User.DoesNotExist:
            pass  # Don't reveal whether email exists

        return Response(
            {'message': _('If the email exists and is not verified, a new link has been sent.')}
        )


class EmailDiagnosticView(APIView):
    """
    TEMPORARY diagnostic endpoint to test email sending.
    Remove after debugging is complete.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        import traceback
        from django.core.mail import send_mail as django_send_mail
        results = {}

        # Step 1: Check email config
        results['email_backend'] = settings.EMAIL_BACKEND
        results['default_from'] = settings.DEFAULT_FROM_EMAIL
        results['anymail'] = {k: v[:10] + '...' for k, v in getattr(settings, 'ANYMAIL', {}).items()}
        results['celery_eager'] = getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False)

        # Step 2: Try sending a basic email
        test_to = request.query_params.get('to', 'cyamamoto0126@gmail.com')
        try:
            r = django_send_mail(
                subject='Diagnostico Email - MCD Agencia',
                message='Si recibes esto, el email funciona en produccion.',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[test_to],
                fail_silently=False,
            )
            results['send_mail'] = {'success': True, 'result': r}
        except Exception as e:
            results['send_mail'] = {'success': False, 'error': f'{type(e).__name__}: {e}', 'trace': traceback.format_exc()[-500:]}

        # Step 3: Try the verification task
        try:
            user = User.objects.filter(email=test_to, is_email_verified=False).first()
            if user:
                results['user_found'] = True
                from .tasks import send_verification_email as sve
                task_result = sve(str(user.id))  # Call directly, not .delay()
                results['task'] = {'success': True, 'result': task_result}
            else:
                results['user_found'] = False
                results['task'] = 'skipped - no unverified user with that email'
        except Exception as e:
            results['task'] = {'success': False, 'error': f'{type(e).__name__}: {e}', 'trace': traceback.format_exc()[-500:]}

        return Response(results)


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

