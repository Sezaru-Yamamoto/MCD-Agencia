"""
Order Serializers for MCD-Agencia.

This module provides serializers for e-commerce operations:
    - Cart and cart items
    - Orders and order lines
    - Addresses
    - Order status management
"""

from decimal import Decimal
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from apps.catalog.serializers import ProductVariantSerializer
from .models import Cart, CartItem, Address, Order, OrderLine, OrderStatusHistory


class CartItemSerializer(serializers.ModelSerializer):
    """Serializer for CartItem model."""

    variant = ProductVariantSerializer(read_only=True)
    variant_id = serializers.UUIDField(write_only=True)
    unit_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    line_total = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    product_name = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            'id', 'variant', 'variant_id', 'quantity',
            'unit_price', 'line_total', 'product_name'
        ]
        read_only_fields = ['id', 'unit_price', 'line_total']

    def get_product_name(self, obj):
        """Get parent product name."""
        return obj.variant.catalog_item.name

    def validate_variant_id(self, value):
        """Validate variant exists and is active."""
        from apps.catalog.models import ProductVariant
        try:
            variant = ProductVariant.objects.get(id=value, is_active=True)
        except ProductVariant.DoesNotExist:
            raise serializers.ValidationError(_('Product variant not found.'))
        return value

    def validate_quantity(self, value):
        """Validate quantity is positive."""
        if value < 1:
            raise serializers.ValidationError(_('Quantity must be at least 1.'))
        return value

    def validate(self, attrs):
        """Validate stock availability."""
        from apps.catalog.models import ProductVariant
        variant_id = attrs.get('variant_id')
        quantity = attrs.get('quantity', 1)

        if variant_id:
            variant = ProductVariant.objects.get(id=variant_id)
            if variant.catalog_item.track_inventory and variant.stock < quantity:
                raise serializers.ValidationError({
                    'quantity': _('Only %(stock)s items available.') % {'stock': variant.stock}
                })

        return attrs


class CartSerializer(serializers.ModelSerializer):
    """Serializer for Cart model."""

    items = CartItemSerializer(many=True, read_only=True)
    subtotal = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    tax_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    total = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    item_count = serializers.IntegerField(read_only=True)
    tax_rate = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = [
            'id', 'items', 'subtotal', 'tax_rate', 'tax_amount',
            'total', 'item_count', 'updated_at'
        ]
        read_only_fields = ['id', 'updated_at']

    def get_tax_rate(self, obj):
        """Get tax rate as percentage."""
        return f"{settings.TAX_RATE * 100:.0f}%"


class AddToCartSerializer(serializers.Serializer):
    """Serializer for adding items to cart."""

    variant_id = serializers.UUIDField(required=True)
    quantity = serializers.IntegerField(min_value=1, default=1)

    def validate_variant_id(self, value):
        """Validate variant exists and is purchasable."""
        from apps.catalog.models import ProductVariant
        try:
            variant = ProductVariant.objects.select_related('catalog_item').get(
                id=value, is_active=True
            )
            if variant.catalog_item.sale_mode == 'QUOTE':
                raise serializers.ValidationError(
                    _('This item requires a quote request.')
                )
        except ProductVariant.DoesNotExist:
            raise serializers.ValidationError(_('Product variant not found.'))
        return value


class AddressSerializer(serializers.ModelSerializer):
    """Serializer for Address model."""

    full_address = serializers.CharField(read_only=True)

    class Meta:
        model = Address
        fields = [
            'id', 'type', 'is_default', 'name', 'phone',
            'street', 'exterior_number', 'interior_number',
            'neighborhood', 'city', 'state', 'postal_code',
            'country', 'reference', 'full_address'
        ]
        read_only_fields = ['id']

    def validate_postal_code(self, value):
        """Validate postal code format."""
        if not value.isdigit() or len(value) != 5:
            raise serializers.ValidationError(_('Postal code must be 5 digits.'))
        return value


class OrderLineSerializer(serializers.ModelSerializer):
    """Serializer for OrderLine model."""

    class Meta:
        model = OrderLine
        fields = [
            'id', 'sku', 'name', 'variant_name', 'quantity',
            'unit_price', 'line_total', 'metadata'
        ]
        read_only_fields = ['id']


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    """Serializer for OrderStatusHistory model."""

    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = OrderStatusHistory
        fields = [
            'id', 'from_status', 'to_status', 'changed_by',
            'changed_by_name', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_changed_by_name(self, obj):
        """Get name of user who changed status."""
        if obj.changed_by:
            return obj.changed_by.full_name
        return 'System'


class OrderSerializer(serializers.ModelSerializer):
    """Serializer for Order model."""

    lines = OrderLineSerializer(many=True, read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)
    balance_due = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    is_fully_paid = serializers.BooleanField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    customer = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'status', 'status_display',
            'customer',
            'shipping_address', 'billing_address',
            'subtotal', 'tax_rate', 'tax_amount', 'total',
            'amount_paid', 'balance_due', 'is_fully_paid',
            'currency', 'payment_method', 'notes',
            'tracking_number', 'tracking_url',
            'lines', 'status_history',
            'created_at', 'paid_at', 'completed_at'
        ]
        read_only_fields = [
            'id', 'order_number', 'status', 'subtotal', 'tax_rate',
            'tax_amount', 'total', 'amount_paid', 'paid_at', 'completed_at',
            'created_at'
        ]

    def get_customer(self, obj):
        """Get customer info."""
        if obj.user:
            return {
                'id': str(obj.user.id),
                'email': obj.user.email,
                'full_name': obj.user.full_name or obj.user.email,
            }
        return None


class OrderListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for order lists."""

    status_display = serializers.CharField(source='get_status_display', read_only=True)
    item_count = serializers.SerializerMethodField()
    customer = serializers.SerializerMethodField()
    payment_method_display = serializers.CharField(
        source='get_payment_method_display', read_only=True
    )

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'status', 'status_display',
            'total', 'amount_paid', 'currency', 'payment_method',
            'payment_method_display', 'item_count', 'customer',
            'created_at'
        ]
        read_only_fields = ['id', 'order_number']

    def get_item_count(self, obj):
        """Get total number of items in order."""
        return sum(line.quantity for line in obj.lines.all())

    def get_customer(self, obj):
        """Get customer info."""
        if obj.user:
            return {
                'id': str(obj.user.id),
                'email': obj.user.email,
                'full_name': obj.user.full_name or obj.user.email,
            }
        return None


class CreateOrderSerializer(serializers.Serializer):
    """Serializer for creating an order from cart."""

    shipping_address_id = serializers.UUIDField(required=True)
    billing_address_id = serializers.UUIDField(required=False)
    use_shipping_as_billing = serializers.BooleanField(default=True)
    payment_method = serializers.ChoiceField(
        choices=Order.PAYMENT_METHOD_CHOICES,
        required=True
    )
    notes = serializers.CharField(required=False, allow_blank=True)
    terms_accepted = serializers.BooleanField(required=True)

    def validate_shipping_address_id(self, value):
        """Validate shipping address belongs to user."""
        user = self.context['request'].user
        if not Address.objects.filter(id=value, user=user).exists():
            raise serializers.ValidationError(_('Invalid shipping address.'))
        return value

    def validate_billing_address_id(self, value):
        """Validate billing address belongs to user."""
        if value:
            user = self.context['request'].user
            if not Address.objects.filter(id=value, user=user).exists():
                raise serializers.ValidationError(_('Invalid billing address.'))
        return value

    def validate_terms_accepted(self, value):
        """Ensure terms are accepted."""
        if not value:
            raise serializers.ValidationError(_('You must accept the terms.'))
        return value

    def validate(self, attrs):
        """Validate cart has items."""
        user = self.context['request'].user
        try:
            cart = Cart.objects.get(user=user)
            if not cart.items.exists():
                raise serializers.ValidationError(_('Your cart is empty.'))
        except Cart.DoesNotExist:
            raise serializers.ValidationError(_('Your cart is empty.'))

        # Use shipping as billing if specified
        if attrs.get('use_shipping_as_billing'):
            attrs['billing_address_id'] = attrs['shipping_address_id']

        return attrs


class UpdateOrderStatusSerializer(serializers.Serializer):
    """Serializer for updating order status (admin)."""

    status = serializers.ChoiceField(choices=Order.STATUS_CHOICES, required=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate_status(self, value):
        """Validate status transition is allowed."""
        order = self.context.get('order')
        if order and not order.can_transition_to(value):
            raise serializers.ValidationError(
                _('Cannot transition from %(from)s to %(to)s.') % {
                    'from': order.status,
                    'to': value
                }
            )
        return value
