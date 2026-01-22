"""
Payment Serializers for MCD-Agencia.

This module provides serializers for payment operations:
    - Payment transactions
    - Payment creation
    - Refunds
    - Webhook handling
"""

from decimal import Decimal

from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from .models import Payment, PaymentWebhookLog, Refund


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for Payment model."""

    provider_display = serializers.CharField(
        source='get_provider_display', read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display', read_only=True
    )
    is_successful = serializers.BooleanField(read_only=True)
    order_number = serializers.SerializerMethodField()
    quote_number = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            'id', 'order', 'order_number', 'quote', 'quote_number',
            'provider', 'provider_display', 'status', 'status_display',
            'amount', 'currency', 'fee_amount', 'net_amount',
            'provider_payment_id', 'provider_order_id',
            'payment_method_type', 'payment_method_id',
            'is_successful', 'error_message',
            'created_at', 'approved_at'
        ]
        read_only_fields = [
            'id', 'fee_amount', 'net_amount', 'provider_payment_id',
            'provider_order_id', 'created_at', 'approved_at'
        ]

    def get_order_number(self, obj):
        """Get order number if payment is for an order."""
        if obj.order:
            return obj.order.order_number
        return None

    def get_quote_number(self, obj):
        """Get quote number if payment is for a quote."""
        if obj.quote:
            return obj.quote.quote_number
        return None


class PaymentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for payment lists."""

    provider_display = serializers.CharField(
        source='get_provider_display', read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display', read_only=True
    )

    class Meta:
        model = Payment
        fields = [
            'id', 'provider', 'provider_display', 'status', 'status_display',
            'amount', 'currency', 'payment_method_type',
            'created_at', 'approved_at'
        ]
        read_only_fields = ['id']


class CreatePaymentSerializer(serializers.Serializer):
    """Serializer for initiating a payment."""

    order_id = serializers.UUIDField(required=False)
    quote_id = serializers.UUIDField(required=False)
    provider = serializers.ChoiceField(
        choices=Payment.PROVIDER_CHOICES,
        required=True
    )
    amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False
    )
    is_deposit = serializers.BooleanField(default=False)

    def validate(self, attrs):
        """Validate payment creation request."""
        order_id = attrs.get('order_id')
        quote_id = attrs.get('quote_id')

        if not order_id and not quote_id:
            raise serializers.ValidationError(
                _('Either order_id or quote_id is required.')
            )

        if order_id and quote_id:
            raise serializers.ValidationError(
                _('Provide either order_id or quote_id, not both.')
            )

        # Validate order exists and is payable
        if order_id:
            from apps.orders.models import Order
            try:
                order = Order.objects.get(id=order_id)
                if order.is_fully_paid:
                    raise serializers.ValidationError({
                        'order_id': _('This order is already fully paid.')
                    })
                attrs['order'] = order
            except Order.DoesNotExist:
                raise serializers.ValidationError({
                    'order_id': _('Order not found.')
                })

        # Validate quote exists and is accepted
        if quote_id:
            from apps.quotes.models import Quote
            try:
                quote = Quote.objects.get(id=quote_id)
                if quote.status != Quote.STATUS_ACCEPTED:
                    raise serializers.ValidationError({
                        'quote_id': _('Quote must be accepted before payment.')
                    })
                attrs['quote'] = quote
            except Quote.DoesNotExist:
                raise serializers.ValidationError({
                    'quote_id': _('Quote not found.')
                })

        return attrs


class MercadoPagoPreferenceSerializer(serializers.Serializer):
    """Serializer for Mercado Pago preference response."""

    preference_id = serializers.CharField(read_only=True)
    init_point = serializers.URLField(read_only=True)
    sandbox_init_point = serializers.URLField(read_only=True)


class PayPalOrderSerializer(serializers.Serializer):
    """Serializer for PayPal order response."""

    order_id = serializers.CharField(read_only=True)
    approval_url = serializers.URLField(read_only=True)


class RefundSerializer(serializers.ModelSerializer):
    """Serializer for Refund model."""

    reason_display = serializers.CharField(
        source='get_reason_display', read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display', read_only=True
    )
    is_partial = serializers.BooleanField(read_only=True)
    processed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Refund
        fields = [
            'id', 'payment', 'amount', 'reason', 'reason_display',
            'reason_details', 'status', 'status_display',
            'provider_refund_id', 'is_partial',
            'processed_by', 'processed_by_name', 'processed_at',
            'created_at'
        ]
        read_only_fields = [
            'id', 'provider_refund_id', 'processed_by',
            'processed_at', 'created_at'
        ]

    def get_processed_by_name(self, obj):
        """Get name of user who processed refund."""
        if obj.processed_by:
            return obj.processed_by.full_name
        return None


class CreateRefundSerializer(serializers.Serializer):
    """Serializer for creating a refund."""

    payment_id = serializers.UUIDField(required=True)
    amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=True
    )
    reason = serializers.ChoiceField(
        choices=Refund.REASON_CHOICES,
        required=True
    )
    reason_details = serializers.CharField(required=False, allow_blank=True)

    def validate_payment_id(self, value):
        """Validate payment exists and is refundable."""
        try:
            payment = Payment.objects.get(id=value)
            if payment.status != Payment.STATUS_APPROVED:
                raise serializers.ValidationError(
                    _('Only approved payments can be refunded.')
                )
            return value
        except Payment.DoesNotExist:
            raise serializers.ValidationError(_('Payment not found.'))

    def validate(self, attrs):
        """Validate refund amount."""
        payment = Payment.objects.get(id=attrs['payment_id'])
        amount = attrs['amount']

        # Calculate already refunded amount
        refunded = sum(
            r.amount for r in payment.refunds.filter(
                status=Refund.STATUS_APPROVED
            )
        )
        available = payment.amount - refunded

        if amount > available:
            raise serializers.ValidationError({
                'amount': _('Refund amount exceeds available amount. Maximum: %(max)s') % {
                    'max': available
                }
            })

        if amount <= 0:
            raise serializers.ValidationError({
                'amount': _('Refund amount must be positive.')
            })

        attrs['payment'] = payment
        return attrs


class PaymentWebhookLogSerializer(serializers.ModelSerializer):
    """Serializer for PaymentWebhookLog model."""

    provider_display = serializers.CharField(
        source='get_provider_display', read_only=True
    )

    class Meta:
        model = PaymentWebhookLog
        fields = [
            'id', 'provider', 'provider_display', 'event_type',
            'event_id', 'payment', 'payload', 'processed',
            'processing_error', 'ip_address', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class PaymentSummarySerializer(serializers.Serializer):
    """Serializer for payment summary report."""

    total_payments = serializers.IntegerField()
    total_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_fees = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_net = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_refunds = serializers.DecimalField(max_digits=14, decimal_places=2)
    by_provider = serializers.DictField()
    by_status = serializers.DictField()
    by_method = serializers.DictField()
