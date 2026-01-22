"""
Quote Serializers for MCD-Agencia.

This module provides serializers for the RFQ system:
    - Quote requests (customer submissions)
    - Quotes (sales team responses)
    - Quote lines
    - Attachments
"""

from decimal import Decimal
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from apps.catalog.serializers import CatalogItemListSerializer
from .models import QuoteRequest, Quote, QuoteLine, QuoteAttachment


class QuoteAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for QuoteAttachment model."""

    class Meta:
        model = QuoteAttachment
        fields = [
            'id', 'file', 'filename', 'file_type', 'file_size',
            'description', 'created_at'
        ]
        read_only_fields = ['id', 'filename', 'file_type', 'file_size', 'created_at']

    def validate_file(self, value):
        """Validate file size and type."""
        # Check file size (max 10MB)
        max_size = settings.QUOTE_MAX_ATTACHMENT_SIZE_MB * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError(
                _('File size must be less than %(size)s MB.') % {
                    'size': settings.QUOTE_MAX_ATTACHMENT_SIZE_MB
                }
            )

        # Check file extension
        import os
        ext = os.path.splitext(value.name)[1].lower().replace('.', '')
        if ext not in settings.ALLOWED_UPLOAD_EXTENSIONS:
            raise serializers.ValidationError(
                _('File type not allowed. Allowed types: %(types)s') % {
                    'types': ', '.join(settings.ALLOWED_UPLOAD_EXTENSIONS)
                }
            )

        return value


class QuoteRequestCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating quote requests (public/guest).

    Handles RFQ submissions from the website.
    """

    attachments = serializers.ListField(
        child=serializers.FileField(),
        required=False,
        max_length=settings.QUOTE_MAX_ATTACHMENTS,
        write_only=True
    )
    catalog_item_id = serializers.UUIDField(required=False, write_only=True)

    class Meta:
        model = QuoteRequest
        fields = [
            'customer_name', 'customer_email', 'customer_phone',
            'customer_company', 'catalog_item_id', 'quantity',
            'dimensions', 'material', 'includes_installation',
            'description', 'preferred_language', 'attachments'
        ]

    def validate_customer_email(self, value):
        """Normalize email."""
        return value.lower().strip()

    def validate_catalog_item_id(self, value):
        """Validate catalog item exists."""
        if value:
            from apps.catalog.models import CatalogItem
            try:
                CatalogItem.objects.get(id=value, is_active=True)
            except CatalogItem.DoesNotExist:
                raise serializers.ValidationError(_('Product/service not found.'))
        return value

    def create(self, validated_data):
        """Create quote request with attachments."""
        attachments = validated_data.pop('attachments', [])
        catalog_item_id = validated_data.pop('catalog_item_id', None)

        # Set catalog item if provided
        if catalog_item_id:
            from apps.catalog.models import CatalogItem
            validated_data['catalog_item'] = CatalogItem.objects.get(id=catalog_item_id)

        # Create quote request
        quote_request = QuoteRequest.objects.create(**validated_data)

        # Create attachments
        for file in attachments:
            QuoteAttachment.objects.create(
                quote_request=quote_request,
                file=file,
                filename=file.name,
                file_type=file.content_type,
                file_size=file.size
            )

        return quote_request


class QuoteRequestSerializer(serializers.ModelSerializer):
    """Serializer for QuoteRequest model (read)."""

    catalog_item = CatalogItemListSerializer(read_only=True)
    attachments = QuoteAttachmentSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = QuoteRequest
        fields = [
            'id', 'request_number', 'status', 'status_display',
            'customer_name', 'customer_email', 'customer_phone',
            'customer_company', 'catalog_item', 'catalog_item_name',
            'quantity', 'dimensions', 'material', 'includes_installation',
            'description', 'preferred_language', 'assigned_to',
            'assigned_to_name', 'attachments', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'request_number', 'created_at', 'updated_at']

    def get_assigned_to_name(self, obj):
        """Get assigned sales rep name."""
        if obj.assigned_to:
            return obj.assigned_to.full_name
        return None


class QuoteRequestAdminSerializer(QuoteRequestSerializer):
    """Serializer for admin quote request management."""

    assigned_to_id = serializers.UUIDField(write_only=True, required=False)

    class Meta(QuoteRequestSerializer.Meta):
        fields = QuoteRequestSerializer.Meta.fields + [
            'user', 'ip_address', 'user_agent', 'assigned_to_id'
        ]


class QuoteLineSerializer(serializers.ModelSerializer):
    """Serializer for QuoteLine model."""

    class Meta:
        model = QuoteLine
        fields = [
            'id', 'concept', 'concept_en', 'description', 'description_en',
            'quantity', 'unit', 'unit_price', 'line_total', 'position'
        ]
        read_only_fields = ['id', 'line_total']


class QuoteSerializer(serializers.ModelSerializer):
    """Serializer for Quote model (public view via token)."""

    lines = QuoteLineSerializer(many=True, read_only=True)
    attachments = QuoteAttachmentSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    is_valid = serializers.BooleanField(read_only=True)
    deposit_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = Quote
        fields = [
            'id', 'quote_number', 'status', 'status_display', 'version',
            'customer_name', 'customer_email', 'customer_company',
            'valid_until', 'is_expired', 'is_valid',
            'subtotal', 'tax_rate', 'tax_amount', 'total', 'currency',
            'payment_mode', 'deposit_percentage', 'deposit_amount',
            'terms', 'terms_en', 'language',
            'lines', 'attachments',
            'sent_at', 'viewed_at', 'accepted_at', 'created_at'
        ]
        read_only_fields = [
            'id', 'quote_number', 'status', 'version', 'subtotal',
            'tax_amount', 'total', 'sent_at', 'viewed_at', 'accepted_at',
            'created_at'
        ]


class QuoteAdminSerializer(QuoteSerializer):
    """Serializer for admin quote management."""

    quote_request = QuoteRequestSerializer(read_only=True)
    quote_request_id = serializers.UUIDField(write_only=True, required=False)
    created_by_name = serializers.SerializerMethodField()

    class Meta(QuoteSerializer.Meta):
        fields = QuoteSerializer.Meta.fields + [
            'quote_request', 'quote_request_id', 'customer', 'created_by',
            'created_by_name', 'internal_notes', 'token', 'pdf_file', 'pdf_file_en'
        ]

    def get_created_by_name(self, obj):
        """Get quote creator name."""
        if obj.created_by:
            return obj.created_by.full_name
        return None


class QuoteCreateSerializer(serializers.Serializer):
    """Serializer for creating a quote (admin)."""

    quote_request_id = serializers.UUIDField(required=False)
    customer_name = serializers.CharField(max_length=255)
    customer_email = serializers.EmailField()
    customer_company = serializers.CharField(max_length=255, required=False, allow_blank=True)
    valid_days = serializers.IntegerField(min_value=1, max_value=90, default=15)
    payment_mode = serializers.ChoiceField(
        choices=[('FULL', 'Full'), ('DEPOSIT_ALLOWED', 'Deposit')],
        default='FULL'
    )
    deposit_percentage = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False
    )
    terms = serializers.CharField(required=False, allow_blank=True)
    terms_en = serializers.CharField(required=False, allow_blank=True)
    internal_notes = serializers.CharField(required=False, allow_blank=True)
    language = serializers.ChoiceField(choices=[('es', 'ES'), ('en', 'EN')], default='es')
    lines = QuoteLineSerializer(many=True)

    def validate_lines(self, value):
        """Ensure at least one line item."""
        if not value:
            raise serializers.ValidationError(_('At least one line item is required.'))
        return value

    def validate(self, attrs):
        """Validate deposit configuration."""
        if attrs.get('payment_mode') == 'DEPOSIT_ALLOWED':
            if not attrs.get('deposit_percentage'):
                raise serializers.ValidationError({
                    'deposit_percentage': _('Deposit percentage is required.')
                })
        return attrs


class QuoteSendSerializer(serializers.Serializer):
    """Serializer for sending a quote to customer."""

    send_email = serializers.BooleanField(default=True)
    custom_message = serializers.CharField(required=False, allow_blank=True)


class QuoteAcceptSerializer(serializers.Serializer):
    """Serializer for accepting a quote (customer)."""

    accepted = serializers.BooleanField(required=True)

    def validate_accepted(self, value):
        """Ensure acceptance is true."""
        if not value:
            raise serializers.ValidationError(_('You must accept the quote.'))
        return value
