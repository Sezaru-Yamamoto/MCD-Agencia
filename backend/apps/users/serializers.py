"""
User Serializers for MCD-Agencia.

This module provides serializers for user-related operations:
    - User registration and profile management
    - Authentication
    - Role management
    - Consent tracking
    - Fiscal data

All serializers include proper validation and documentation.
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from .models import Role, UserConsent, FiscalData

User = get_user_model()


class RoleSerializer(serializers.ModelSerializer):
    """
    Serializer for Role model.

    Used for displaying role information in user responses.
    """

    class Meta:
        model = Role
        fields = ['id', 'name', 'display_name', 'description']
        read_only_fields = ['id']


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.

    Handles new user creation with password validation
    and required consent fields.
    """

    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        validators=[validate_password],
        help_text=_('Password must be at least 8 characters with 1 uppercase and 1 number.')
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        help_text=_('Confirm your password.')
    )
    terms_accepted = serializers.BooleanField(
        write_only=True,
        required=True,
        help_text=_('Must accept terms and conditions.')
    )
    privacy_accepted = serializers.BooleanField(
        write_only=True,
        required=True,
        help_text=_('Must accept privacy policy.')
    )
    marketing_consent = serializers.BooleanField(
        required=False,
        default=False,
        help_text=_('Consent to receive marketing communications.')
    )

    class Meta:
        model = User
        fields = [
            'email',
            'first_name',
            'last_name',
            'phone',
            'date_of_birth',
            'password',
            'password_confirm',
            'terms_accepted',
            'privacy_accepted',
            'marketing_consent',
            'preferred_language',
        ]
        extra_kwargs = {
            'email': {
                'required': True,
                'error_messages': {
                    'unique': 'Ya existe una cuenta con este correo electrónico.',
                },
            },
            'first_name': {'required': True},
            'last_name': {'required': True},
            'phone': {'required': True},
            'date_of_birth': {'required': True},
        }

    def validate(self, attrs):
        """Validate registration data."""
        # Check passwords match
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': _('Passwords do not match.')
            })

        # Check required consents
        if not attrs.get('terms_accepted'):
            raise serializers.ValidationError({
                'terms_accepted': _('You must accept the terms and conditions.')
            })

        if not attrs.get('privacy_accepted'):
            raise serializers.ValidationError({
                'privacy_accepted': _('You must accept the privacy policy.')
            })

        return attrs

    def create(self, validated_data):
        """Create new user with consents."""
        # Remove non-model fields
        validated_data.pop('password_confirm')
        validated_data.pop('terms_accepted')
        validated_data.pop('privacy_accepted')
        password = validated_data.pop('password')

        # Create user
        user = User.objects.create_user(
            password=password,
            **validated_data
        )

        return user


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for User model.

    Used for user profile display and updates.
    """

    role = RoleSerializer(read_only=True)
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'phone',
            'date_of_birth',
            'role',
            'preferred_language',
            'avatar',
            'marketing_consent',
            'is_email_verified',
            'created_at',
        ]
        read_only_fields = ['id', 'email', 'is_email_verified', 'created_at']


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user profile.
    """

    class Meta:
        model = User
        fields = [
            'first_name',
            'last_name',
            'phone',
            'date_of_birth',
            'preferred_language',
            'avatar',
            'marketing_consent',
        ]


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer for password change.
    """

    current_password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
        validators=[validate_password]
    )
    new_password_confirm = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )

    def validate_current_password(self, value):
        """Validate current password is correct."""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError(_('Current password is incorrect.'))
        return value

    def validate(self, attrs):
        """Validate new passwords match."""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': _('New passwords do not match.')
            })
        return attrs


class UserConsentSerializer(serializers.ModelSerializer):
    """
    Serializer for UserConsent model.
    """

    class Meta:
        model = UserConsent
        fields = [
            'id',
            'document_type',
            'document_version',
            'accepted_at',
            'method',
            'revoked_at',
            'is_active',
        ]
        read_only_fields = ['id', 'accepted_at', 'revoked_at', 'is_active']


class FiscalDataSerializer(serializers.ModelSerializer):
    """
    Serializer for FiscalData model.

    Handles Mexican tax information for invoicing.
    """

    full_address = serializers.CharField(read_only=True)

    class Meta:
        model = FiscalData
        fields = [
            'id',
            'rfc',
            'business_name',
            'tax_regime',
            'cfdi_use',
            'street',
            'exterior_number',
            'interior_number',
            'neighborhood',
            'city',
            'state',
            'postal_code',
            'country',
            'full_address',
            'is_default',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_rfc(self, value):
        """Validate RFC format."""
        import re
        # RFC pattern for Mexico (12 or 13 characters)
        pattern = r'^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$'
        if not re.match(pattern, value.upper()):
            raise serializers.ValidationError(_('Invalid RFC format.'))
        return value.upper()

    def validate_postal_code(self, value):
        """Validate postal code is 5 digits."""
        if not value.isdigit() or len(value) != 5:
            raise serializers.ValidationError(_('Postal code must be 5 digits.'))
        return value


class UserAdminSerializer(serializers.ModelSerializer):
    """
    Serializer for admin user management.

    Includes additional fields for admin operations.
    """

    role = RoleSerializer(read_only=True)
    role_id = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(),
        source='role',
        write_only=True,
        required=False
    )

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'phone',
            'date_of_birth',
            'role',
            'role_id',
            'is_active',
            'is_staff',
            'is_email_verified',
            'preferred_language',
            'marketing_consent',
            'last_login',
            'last_login_ip',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'last_login', 'last_login_ip', 'created_at', 'updated_at']


# =============================================================================
# JWT Token Serializers
# =============================================================================

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class EmailVerifiedTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT token serializer that enforces email verification.

    Users who registered via email/password must verify their email
    before they can log in. OAuth users (Google) are automatically
    verified since Google already verified their email.
    """

    def validate(self, attrs):
        """
        Validate credentials and check email verification status.

        Raises:
            serializers.ValidationError: If email is not verified.
        """
        # First, validate credentials (this sets self.user)
        data = super().validate(attrs)

        # Check if email is verified
        if not self.user.is_email_verified:
            raise serializers.ValidationError(
                {
                    'detail': _(
                        'Please verify your email address before logging in. '
                        'Check your inbox for the verification email.'
                    ),
                    'code': 'email_not_verified'
                }
            )

        return data
