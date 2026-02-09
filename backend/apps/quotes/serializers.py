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
from .models import (
    QuoteRequest, Quote, QuoteLine, QuoteAttachment,
    QuoteResponse, GuestAccessToken, QuoteChangeRequest
)


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
            'description', 'preferred_language', 'attachments',
            'service_type', 'service_details', 'required_date'
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
        """Create quote request with attachments and auto-assignment."""
        attachments = validated_data.pop('attachments', [])
        catalog_item_id = validated_data.pop('catalog_item_id', None)

        # Set catalog item if provided
        if catalog_item_id:
            from apps.catalog.models import CatalogItem
            validated_data['catalog_item'] = CatalogItem.objects.get(id=catalog_item_id)

        # Check if user is authenticated
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user'] = request.user
            validated_data['is_guest'] = False
        else:
            validated_data['is_guest'] = True

        # Set initial status
        validated_data['status'] = QuoteRequest.STATUS_PENDING

        # Create quote request
        quote_request = QuoteRequest.objects.create(**validated_data)

        # Calculate and set urgency
        quote_request.urgency = quote_request.calculate_urgency()
        quote_request.save(update_fields=['urgency'])

        # Create attachments
        for file in attachments:
            QuoteAttachment.objects.create(
                quote_request=quote_request,
                file=file,
                filename=file.name,
                file_type=file.content_type,
                file_size=file.size
            )

        # Attempt automatic assignment
        quote_request.assign_to_sales_rep(auto=True)

        return quote_request


class QuoteRequestSerializer(serializers.ModelSerializer):
    """Serializer for QuoteRequest model (read)."""

    catalog_item = CatalogItemListSerializer(read_only=True)
    attachments = QuoteAttachmentSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    urgency_display = serializers.CharField(source='get_urgency_display', read_only=True)
    assigned_to_name = serializers.SerializerMethodField()
    days_until_required = serializers.IntegerField(read_only=True)

    class Meta:
        model = QuoteRequest
        fields = [
            'id', 'request_number', 'status', 'status_display',
            'customer_name', 'customer_email', 'customer_phone',
            'customer_company', 'catalog_item', 'catalog_item_name',
            'quantity', 'dimensions', 'material', 'includes_installation',
            'description', 'preferred_language', 'assigned_to',
            'assigned_to_name', 'attachments', 'created_at', 'updated_at',
            'service_type', 'service_details', 'is_guest', 'required_date',
            'urgency', 'urgency_display', 'days_until_required',
            'assignment_method', 'assigned_at'
        ]
        read_only_fields = ['id', 'request_number', 'created_at', 'updated_at', 'urgency', 'assigned_at']

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
            'sent_at', 'viewed_at', 'accepted_at', 'created_at',
            'delivery_time_text', 'estimated_delivery_date',
            'payment_methods', 'payment_conditions', 'included_services',
            'customer_notes', 'view_count'
        ]
        read_only_fields = [
            'id', 'quote_number', 'status', 'version', 'subtotal',
            'tax_amount', 'total', 'sent_at', 'viewed_at', 'accepted_at',
            'created_at', 'view_count'
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

    quote_request_id = serializers.UUIDField(required=False, allow_null=True)
    customer_name = serializers.CharField(max_length=255)
    customer_email = serializers.EmailField()
    customer_company = serializers.CharField(max_length=255, required=False, allow_blank=True)
    valid_days = serializers.IntegerField(min_value=1, max_value=90, default=15)
    payment_mode = serializers.ChoiceField(
        choices=[('FULL', 'Full'), ('DEPOSIT_ALLOWED', 'Deposit')],
        default='FULL'
    )
    deposit_percentage = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False, allow_null=True
    )
    terms = serializers.CharField(required=False, allow_blank=True)
    terms_en = serializers.CharField(required=False, allow_blank=True)
    internal_notes = serializers.CharField(required=False, allow_blank=True)
    language = serializers.ChoiceField(choices=[('es', 'ES'), ('en', 'EN')], default='es')
    # Additional fields
    delivery_time_text = serializers.CharField(max_length=100, required=False, allow_blank=True)
    estimated_delivery_date = serializers.DateField(required=False, allow_null=True)
    payment_methods = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )
    payment_conditions = serializers.CharField(required=False, allow_blank=True)
    included_services = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )
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

    def create(self, validated_data):
        """Create a Quote with its line items."""
        from django.utils import timezone
        from datetime import timedelta

        # Extract line items data
        lines_data = validated_data.pop('lines', [])
        quote_request_id = validated_data.pop('quote_request_id', None)
        valid_days = validated_data.pop('valid_days', 15)

        # Get request context
        request = self.context.get('request')
        created_by = request.user if request and request.user.is_authenticated else None

        # Get quote request if provided
        quote_request = None
        if quote_request_id:
            try:
                quote_request = QuoteRequest.objects.get(id=quote_request_id)
            except QuoteRequest.DoesNotExist:
                pass

        # Calculate validity date
        valid_until = timezone.now() + timedelta(days=valid_days)

        # Create the quote
        quote = Quote.objects.create(
            quote_request=quote_request,
            customer_name=validated_data.get('customer_name'),
            customer_email=validated_data.get('customer_email'),
            customer_company=validated_data.get('customer_company', ''),
            created_by=created_by,
            valid_until=valid_until,
            payment_mode=validated_data.get('payment_mode', 'FULL'),
            deposit_percentage=validated_data.get('deposit_percentage'),
            terms=validated_data.get('terms', ''),
            terms_en=validated_data.get('terms_en', ''),
            internal_notes=validated_data.get('internal_notes', ''),
            language=validated_data.get('language', 'es'),
            delivery_time_text=validated_data.get('delivery_time_text', ''),
            estimated_delivery_date=validated_data.get('estimated_delivery_date'),
            payment_methods=validated_data.get('payment_methods', []),
            payment_conditions=validated_data.get('payment_conditions', ''),
            included_services=validated_data.get('included_services', []),
            status=Quote.STATUS_DRAFT,
        )

        # Create line items
        subtotal = Decimal('0.00')
        for position, line_data in enumerate(lines_data):
            quantity = Decimal(str(line_data.get('quantity', 1)))
            unit_price = Decimal(str(line_data.get('unit_price', 0)))
            line_total = quantity * unit_price

            QuoteLine.objects.create(
                quote=quote,
                concept=line_data.get('concept', ''),
                concept_en=line_data.get('concept_en', ''),
                description=line_data.get('description', ''),
                description_en=line_data.get('description_en', ''),
                quantity=quantity,
                unit=line_data.get('unit', 'pz'),
                unit_price=unit_price,
                line_total=line_total,
                position=line_data.get('position', position),
            )
            subtotal += line_total

        # Calculate and save totals
        quote.subtotal = subtotal
        quote.tax_amount = subtotal * quote.tax_rate
        quote.total = subtotal + quote.tax_amount
        quote.save(update_fields=['subtotal', 'tax_amount', 'total'])

        # Update quote request status if linked
        if quote_request and quote_request.status == QuoteRequest.STATUS_IN_REVIEW:
            quote_request.status = QuoteRequest.STATUS_QUOTED
            quote_request.save(update_fields=['status', 'updated_at'])

        # B: Auto-link customer by email
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            customer_user = User.objects.get(
                email__iexact=quote.customer_email, is_active=True
            )
            quote.customer = customer_user
            quote.save(update_fields=['customer'])
        except User.DoesNotExist:
            pass

        return quote


class QuoteSendSerializer(serializers.Serializer):
    """Serializer for sending a quote to customer."""

    send_email = serializers.BooleanField(default=True)
    custom_message = serializers.CharField(required=False, allow_blank=True)


class QuoteAcceptSerializer(serializers.Serializer):
    """Serializer for accepting a quote (customer)."""

    accepted = serializers.BooleanField(required=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    signature = serializers.CharField(required=False, allow_blank=True)
    signature_name = serializers.CharField(required=False, allow_blank=True, max_length=255)

    def validate_accepted(self, value):
        """Ensure acceptance is true."""
        if not value:
            raise serializers.ValidationError(_('You must accept the quote.'))
        return value


class QuoteResponseSerializer(serializers.ModelSerializer):
    """Serializer for QuoteResponse model."""

    action_display = serializers.CharField(source='get_action_display', read_only=True)
    responded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = QuoteResponse
        fields = [
            'id', 'quote', 'action', 'action_display', 'comment',
            'responded_by', 'responded_by_name', 'guest_name', 'guest_email',
            'ip_address', 'created_at'
        ]
        read_only_fields = ['id', 'ip_address', 'created_at']

    def get_responded_by_name(self, obj):
        """Get responder name."""
        if obj.responded_by:
            return obj.responded_by.full_name
        return obj.guest_name or None


class QuoteResponseCreateSerializer(serializers.Serializer):
    """Serializer for creating a quote response."""

    action = serializers.ChoiceField(choices=QuoteResponse.ACTION_CHOICES)
    comment = serializers.CharField(required=False, allow_blank=True)
    guest_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    guest_email = serializers.EmailField(required=False, allow_blank=True)

    def validate(self, attrs):
        """Validate response based on action."""
        action = attrs.get('action')

        # Rejection and change requests require a comment
        if action in [QuoteResponse.ACTION_REJECTION, QuoteResponse.ACTION_CHANGE_REQUEST]:
            if not attrs.get('comment'):
                raise serializers.ValidationError({
                    'comment': _('A comment is required for this action.')
                })

        return attrs


class SalesRepDashboardSerializer(serializers.Serializer):
    """Serializer for sales rep dashboard data."""

    pending_requests = serializers.IntegerField()
    quotes_without_response = serializers.IntegerField()
    conversion_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    total_quoted = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_approved = serializers.DecimalField(max_digits=12, decimal_places=2)
    urgent_requests = serializers.ListField(child=QuoteRequestSerializer())
    recent_activity = serializers.ListField()


# ==========================================
# Quote Change Request Serializers
# ==========================================

class ProposedLineSerializer(serializers.Serializer):
    """Serializer for a proposed line item change."""

    id = serializers.UUIDField(required=False, allow_null=True)
    action = serializers.ChoiceField(
        choices=['modify', 'add', 'delete'],
        required=True
    )
    concept = serializers.CharField(max_length=255, required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    quantity = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        min_value=Decimal('0.01')
    )
    unit = serializers.CharField(max_length=20, required=False, default='pz')
    unit_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        allow_null=True
    )
    original_values = serializers.DictField(required=False)

    def validate(self, attrs):
        """Validate line based on action."""
        action = attrs.get('action')

        if action == 'delete':
            # Delete action only needs the line ID
            if not attrs.get('id'):
                raise serializers.ValidationError({
                    'id': _('Line ID is required for delete action.')
                })
        elif action == 'add':
            # Add action needs concept and quantity
            if not attrs.get('concept'):
                raise serializers.ValidationError({
                    'concept': _('Concept is required for new items.')
                })
            if not attrs.get('quantity'):
                raise serializers.ValidationError({
                    'quantity': _('Quantity is required for new items.')
                })
        elif action == 'modify':
            # Modify action needs the line ID
            if not attrs.get('id'):
                raise serializers.ValidationError({
                    'id': _('Line ID is required for modify action.')
                })

        return attrs


class QuoteChangeRequestCreateSerializer(serializers.Serializer):
    """Serializer for creating a change request from customer."""

    proposed_lines = ProposedLineSerializer(many=True, required=True)
    customer_comments = serializers.CharField(required=False, allow_blank=True)

    def validate_proposed_lines(self, value):
        """Validate that there are valid changes."""
        if not value:
            raise serializers.ValidationError(
                _('At least one line change is required.')
            )

        # Check that not all lines are being deleted
        non_delete_actions = [
            line for line in value if line.get('action') != 'delete'
        ]
        delete_actions = [
            line for line in value if line.get('action') == 'delete'
        ]

        # If there are only delete actions, we need to check the quote has other lines
        # This will be validated in the view with access to the quote

        return value

    def create(self, validated_data):
        """Create the change request."""
        quote = self.context.get('quote')
        request = self.context.get('request')

        # Create snapshot of original quote
        original_snapshot = {
            'quote_number': quote.quote_number,
            'subtotal': str(quote.subtotal),
            'tax_amount': str(quote.tax_amount),
            'total': str(quote.total),
            'lines': [
                {
                    'id': str(line.id),
                    'concept': line.concept,
                    'description': line.description,
                    'quantity': str(line.quantity),
                    'unit': line.unit,
                    'unit_price': str(line.unit_price),
                    'line_total': str(line.line_total),
                }
                for line in quote.lines.all()
            ]
        }

        # Convert proposed_lines UUIDs and Decimals to strings for JSON serialization
        proposed_lines_serializable = []
        for line in validated_data['proposed_lines']:
            serializable_line = {}
            for key, value in line.items():
                if hasattr(value, 'hex'):  # UUID
                    serializable_line[key] = str(value)
                elif hasattr(value, 'quantize'):  # Decimal
                    serializable_line[key] = str(value)
                else:
                    serializable_line[key] = value
            proposed_lines_serializable.append(serializable_line)

        # Get client IP
        ip_address = None
        if request:
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip_address = x_forwarded_for.split(',')[0]
            else:
                ip_address = request.META.get('REMOTE_ADDR')

        # Create the change request
        change_request = QuoteChangeRequest.objects.create(
            quote=quote,
            customer_name=quote.customer_name,
            customer_email=quote.customer_email,
            customer_comments=validated_data.get('customer_comments', ''),
            proposed_lines=proposed_lines_serializable,
            original_snapshot=original_snapshot,
            ip_address=ip_address,
        )

        return change_request


class QuoteChangeRequestSerializer(serializers.ModelSerializer):
    """Serializer for QuoteChangeRequest model (read)."""

    quote_number = serializers.CharField(source='quote.quote_number', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    changes_summary = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = QuoteChangeRequest
        fields = [
            'id', 'quote', 'quote_number', 'status', 'status_display',
            'customer_name', 'customer_email', 'customer_comments',
            'proposed_lines', 'original_snapshot', 'changes_summary',
            'reviewed_by', 'reviewed_by_name', 'reviewed_at', 'review_notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'quote', 'quote_number', 'status', 'status_display',
            'customer_name', 'customer_email', 'original_snapshot',
            'reviewed_by', 'reviewed_by_name', 'reviewed_at',
            'created_at', 'updated_at'
        ]

    def get_changes_summary(self, obj):
        """Get summary of proposed changes."""
        return obj.get_changes_summary()

    def get_reviewed_by_name(self, obj):
        """Get reviewer name."""
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name() or obj.reviewed_by.email
        return None


class QuoteChangeRequestReviewSerializer(serializers.Serializer):
    """Serializer for reviewing a change request (sales/admin)."""

    action = serializers.ChoiceField(choices=['approve', 'reject'], required=True)
    notes = serializers.CharField(required=False, allow_blank=True)
