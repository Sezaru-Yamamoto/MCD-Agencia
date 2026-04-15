"""
Order Serializers for MCD-Agencia.

This module provides serializers for e-commerce operations:
    - Cart and cart items
    - Orders and order lines
    - Addresses
    - Order status management
"""

import re
from decimal import Decimal
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from apps.catalog.serializers import ProductVariantSerializer
from .models import Cart, CartItem, Address, Order, OrderLine, OrderStatusHistory


QUOTE_NUMBER_REGEX = re.compile(r'(COT-\d{8}-\d+)', flags=re.IGNORECASE)


def _extract_quote_number(text: str) -> str:
    match = QUOTE_NUMBER_REGEX.search(str(text or ''))
    if not match:
        return ''
    return match.group(1).upper()


def _resolve_quote_id_for_order(obj) -> str | None:
    if obj.quote_id:
        return str(obj.quote_id)

    candidates = [
        getattr(obj, 'internal_notes', '') or '',
        getattr(obj, 'notes', '') or '',
    ]

    for history in getattr(obj, 'status_history', []).all() if hasattr(getattr(obj, 'status_history', None), 'all') else []:
        candidates.append(getattr(history, 'notes', '') or '')

    for line in getattr(obj, 'lines', []).all() if hasattr(getattr(obj, 'lines', None), 'all') else []:
        candidates.append(getattr(line, 'sku', '') or '')

    quote_number = ''
    for value in candidates:
        quote_number = _extract_quote_number(value)
        if quote_number:
            break

    if not quote_number:
        return None

    from apps.quotes.models import Quote

    quote_id = Quote.objects.filter(quote_number=quote_number).values_list('id', flat=True).first()
    if quote_id:
        return str(quote_id)
    return None


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
    product_slug = serializers.SerializerMethodField()
    product_image = serializers.SerializerMethodField()
    variant_display_name = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            'id', 'variant', 'variant_id', 'quantity',
            'unit_price', 'line_total', 'product_name',
            'product_slug', 'product_image', 'variant_display_name'
        ]
        read_only_fields = ['id', 'unit_price', 'line_total']

    def get_product_name(self, obj):
        """Get parent product name."""
        return obj.variant.catalog_item.name

    def get_product_slug(self, obj):
        """Get parent product slug."""
        return obj.variant.catalog_item.slug

    def get_product_image(self, obj):
        """Get catalog item's primary image URL (or first image)."""
        catalog_item = obj.variant.catalog_item
        primary = catalog_item.images.filter(is_primary=True).first() or catalog_item.images.first()
        return primary.image.url if primary and primary.image else None

    def get_variant_display_name(self, obj):
        """Friendly variant label for UI."""
        name = (obj.variant.name or '').strip()
        if name.lower() == 'default' or not name:
            return 'Base'
        return name

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
    pickup_branch_detail = serializers.SerializerMethodField()
    quote = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'status', 'status_display',
            'quote',
            'customer',
            'shipping_address', 'billing_address',
            'subtotal', 'tax_rate', 'tax_amount', 'total',
            'amount_paid', 'balance_due', 'is_fully_paid',
            'currency', 'payment_method', 'notes',
            'tracking_number', 'tracking_url',
            'delivery_method', 'pickup_branch', 'pickup_branch_detail',
            'delivery_address',
            'scheduled_date',
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

    def get_quote(self, obj):
        """Return source quote UUID if available."""
        return _resolve_quote_id_for_order(obj)

    def get_pickup_branch_detail(self, obj):
        """Return branch name and address for display."""
        if obj.pickup_branch:
            branch = obj.pickup_branch
            return {
                'id': str(branch.id),
                'name': branch.name,
                'city': branch.city,
                'state': branch.state,
                'full_address': getattr(branch, 'full_address', ''),
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
    quote = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'status', 'status_display',
            'quote',
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

    def get_quote(self, obj):
        """Return source quote UUID if available."""
        return _resolve_quote_id_for_order(obj)


class CreateOrderSerializer(serializers.Serializer):
    """Serializer for creating an order from cart."""

    shipping_address_id = serializers.UUIDField(required=True)
    billing_address_id = serializers.UUIDField(required=False)
    use_shipping_as_billing = serializers.BooleanField(default=True)
    payment_method = serializers.ChoiceField(
        choices=Order.PAYMENT_METHOD_CHOICES,
        required=True
    )
    delivery_method = serializers.ChoiceField(
        choices=[Order.DELIVERY_PICKUP, Order.DELIVERY_SHIPPING],
        required=False,
        default=Order.DELIVERY_SHIPPING,
    )
    pickup_branch_id = serializers.UUIDField(required=False, allow_null=True)
    shipping_fee = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        default=0,
        min_value=0,
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
        """Validate cart, billing behavior, and delivery constraints."""
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

        delivery_method = attrs.get('delivery_method', Order.DELIVERY_SHIPPING)
        pickup_branch_id = attrs.get('pickup_branch_id')

        if delivery_method == Order.DELIVERY_PICKUP:
            if not pickup_branch_id:
                raise serializers.ValidationError({'pickup_branch_id': _('Pickup branch is required for pickup delivery.')})

            from apps.content.models import Branch

            if not Branch.objects.filter(id=pickup_branch_id, is_active=True).exists():
                raise serializers.ValidationError({'pickup_branch_id': _('Invalid pickup branch.')})

        return attrs


class UpdateOrderStatusSerializer(serializers.Serializer):
    """Serializer for updating order status (admin)."""

    status = serializers.ChoiceField(choices=Order.STATUS_CHOICES, required=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    scheduled_date = serializers.DateTimeField(required=False, allow_null=True)

    def validate_status(self, value):
        """Validate status transition is allowed."""
        order = self.context.get('order')
        if (
            order
            and order.status == Order.STATUS_PENDING_PAYMENT
            and value == Order.STATUS_IN_PRODUCTION
            and order.payment_method in ['mercadopago', 'paypal']
        ):
            return value
        if order and not order.can_transition_to(value):
            raise serializers.ValidationError(
                _('Cannot transition from %(from)s to %(to)s.') % {
                    'from': order.status,
                    'to': value
                }
            )
        return value
