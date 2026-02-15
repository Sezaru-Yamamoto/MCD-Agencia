"""
Order Views for MCD-Agencia.

This module provides ViewSets for order operations:
    - Cart management
    - Order creation and management
    - Address management
    - Order status updates (admin)
"""

from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from apps.audit.models import AuditLog
from apps.catalog.models import ProductVariant
from apps.core.pagination import StandardPagination
from apps.core.views import is_internal_user
from apps.inventory.models import InventoryMovement
from .models import Cart, CartItem, Address, Order, OrderLine, OrderStatusHistory
from .serializers import (
    CartSerializer,
    CartItemSerializer,
    AddToCartSerializer,
    AddressSerializer,
    OrderSerializer,
    OrderListSerializer,
    CreateOrderSerializer,
    UpdateOrderStatusSerializer,
)


class CartView(APIView):
    """
    Handle cart operations.

    GET /api/v1/orders/cart/ - Get current cart
    POST /api/v1/orders/cart/add/ - Add item to cart
    PUT /api/v1/orders/cart/update/{item_id}/ - Update item quantity
    DELETE /api/v1/orders/cart/remove/{item_id}/ - Remove item
    DELETE /api/v1/orders/cart/clear/ - Clear cart
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get current user's cart."""
        cart, created = Cart.objects.get_or_create(user=request.user)
        serializer = CartSerializer(cart, context={'request': request})
        return Response(serializer.data)


class AddToCartView(APIView):
    """Add item to cart."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Add item to cart."""
        serializer = AddToCartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        cart, _ = Cart.objects.get_or_create(user=request.user)
        variant_id = serializer.validated_data['variant_id']
        quantity = serializer.validated_data.get('quantity', 1)

        variant = ProductVariant.objects.select_related('catalog_item').get(
            id=variant_id
        )

        # Check if item already in cart
        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            variant=variant,
            defaults={'quantity': quantity}
        )

        if not created:
            cart_item.quantity += quantity
            cart_item.save(update_fields=['quantity', 'updated_at'])

        return Response(
            CartSerializer(cart, context={'request': request}).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )


class UpdateCartItemView(APIView):
    """Update cart item quantity."""

    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, item_id):
        """Update item quantity."""
        try:
            cart = Cart.objects.get(user=request.user)
            cart_item = cart.items.get(id=item_id)
        except (Cart.DoesNotExist, CartItem.DoesNotExist):
            return Response(
                {'error': _('Item not found in cart.')},
                status=status.HTTP_404_NOT_FOUND
            )

        quantity = request.data.get('quantity')
        if not quantity or quantity < 1:
            return Response(
                {'error': _('Quantity must be at least 1.')},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check stock
        if cart_item.variant.catalog_item.track_inventory:
            if cart_item.variant.stock < quantity:
                return Response(
                    {'error': _('Insufficient stock. Available: %(stock)s') % {
                        'stock': cart_item.variant.stock
                    }},
                    status=status.HTTP_400_BAD_REQUEST
                )

        cart_item.quantity = quantity
        cart_item.save(update_fields=['quantity', 'updated_at'])

        return Response(CartSerializer(cart, context={'request': request}).data)


class RemoveCartItemView(APIView):
    """Remove item from cart."""

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, item_id):
        """Remove item from cart."""
        try:
            cart = Cart.objects.get(user=request.user)
            cart_item = cart.items.get(id=item_id)
        except (Cart.DoesNotExist, CartItem.DoesNotExist):
            return Response(
                {'error': _('Item not found in cart.')},
                status=status.HTTP_404_NOT_FOUND
            )

        cart_item.delete()
        return Response(CartSerializer(cart, context={'request': request}).data)


class ClearCartView(APIView):
    """Clear all items from cart."""

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        """Clear cart."""
        try:
            cart = Cart.objects.get(user=request.user)
            cart.items.all().delete()
        except Cart.DoesNotExist:
            pass

        cart, _ = Cart.objects.get_or_create(user=request.user)
        return Response(CartSerializer(cart, context={'request': request}).data)


class MergeGuestCartView(APIView):
    """
    Merge guest cart items into user's cart after login.
    
    POST /api/v1/orders/cart/merge/
    Body: { "items": [{ "variant_id": "uuid", "quantity": 1 }, ...] }
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Merge guest cart items into user's cart."""
        items = request.data.get('items', [])
        
        if not items:
            cart, _ = Cart.objects.get_or_create(user=request.user)
            return Response(CartSerializer(cart, context={'request': request}).data)
        
        cart, _ = Cart.objects.get_or_create(user=request.user)
        
        for item_data in items:
            variant_id = item_data.get('variant_id')
            quantity = item_data.get('quantity', 1)
            
            if not variant_id or quantity < 1:
                continue
                
            try:
                variant = ProductVariant.objects.select_related('catalog_item').get(
                    id=variant_id
                )
                
                # Check if item already in cart
                cart_item, created = CartItem.objects.get_or_create(
                    cart=cart,
                    variant=variant,
                    defaults={'quantity': quantity}
                )
                
                if not created:
                    # Add quantity if item already exists
                    cart_item.quantity += quantity
                    cart_item.save(update_fields=['quantity', 'updated_at'])
                    
            except ProductVariant.DoesNotExist:
                # Skip invalid variants
                continue
        
        return Response(CartSerializer(cart, context={'request': request}).data)


class AddressViewSet(viewsets.ModelViewSet):
    """
    ViewSet for address management.

    GET /api/v1/orders/addresses/
    POST /api/v1/orders/addresses/
    PUT /api/v1/orders/addresses/{id}/
    DELETE /api/v1/orders/addresses/{id}/
    """

    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        """Return addresses for current user."""
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        """Create address for current user."""
        address = serializer.save(user=self.request.user)

        # If marked as default, unset other defaults of same type
        if address.is_default:
            Address.objects.filter(
                user=self.request.user,
                type=address.type,
                is_default=True
            ).exclude(id=address.id).update(is_default=False)

    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        """Set address as default."""
        address = self.get_object()
        Address.objects.filter(
            user=request.user,
            type=address.type,
            is_default=True
        ).update(is_default=False)
        address.is_default = True
        address.save(update_fields=['is_default', 'updated_at'])
        return Response(AddressSerializer(address).data)


class OrderViewSet(viewsets.ModelViewSet):
    """
    ViewSet for order management.

    Customer endpoints:
        GET /api/v1/orders/ - List user's orders
        GET /api/v1/orders/{id}/ - Order details
        POST /api/v1/orders/create/ - Create order from cart

    Admin endpoints:
        GET /api/v1/admin/orders/ - List all orders
        PUT /api/v1/admin/orders/{id}/ - Update order
        POST /api/v1/admin/orders/{id}/update-status/ - Change status
    """

    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status']

    def get_queryset(self):
        """Return orders based on user role."""
        if is_internal_user(self.request.user):
            return Order.objects.all().select_related('pickup_branch').prefetch_related('lines', 'status_history')
        return Order.objects.filter(
            user=self.request.user, is_deleted=False
        ).select_related('pickup_branch').prefetch_related('lines', 'status_history')

    def get_serializer_class(self):
        """Return appropriate serializer."""
        if self.action == 'list':
            return OrderListSerializer
        return OrderSerializer

    @action(detail=False, methods=['post'])
    def create_order(self, request):
        """Create order from cart."""
        serializer = CreateOrderSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            # Get cart
            cart = Cart.objects.prefetch_related(
                'items__variant__catalog_item'
            ).get(user=request.user)

            # Get addresses
            shipping_address = Address.objects.get(
                id=serializer.validated_data['shipping_address_id']
            )
            billing_address = Address.objects.get(
                id=serializer.validated_data['billing_address_id']
            )

            # Calculate totals
            subtotal = sum(item.line_total for item in cart.items.all())
            tax_amount = subtotal * settings.TAX_RATE
            total = subtotal + tax_amount

            # Create order
            order = Order.objects.create(
                user=request.user,
                status=Order.STATUS_PENDING_PAYMENT,
                shipping_address=shipping_address.full_address,
                billing_address=billing_address.full_address,
                subtotal=subtotal,
                tax_rate=settings.TAX_RATE,
                tax_amount=tax_amount,
                total=total,
                payment_method=serializer.validated_data['payment_method'],
                notes=serializer.validated_data.get('notes', '')
            )

            # Create order lines
            for cart_item in cart.items.all():
                variant = cart_item.variant
                OrderLine.objects.create(
                    order=order,
                    sku=variant.sku,
                    name=variant.catalog_item.name,
                    variant_name=variant.name,
                    quantity=cart_item.quantity,
                    unit_price=cart_item.unit_price,
                    line_total=cart_item.line_total,
                    metadata={
                        'variant_id': str(variant.id),
                        'catalog_item_id': str(variant.catalog_item.id)
                    }
                )

            # Create initial status history
            OrderStatusHistory.objects.create(
                order=order,
                from_status=Order.STATUS_DRAFT,
                to_status=Order.STATUS_PENDING_PAYMENT,
                changed_by=request.user,
                notes=_('Order created')
            )

            # Log order creation
            AuditLog.log(
                entity=order,
                action=AuditLog.ACTION_CREATED,
                actor=request.user,
                after_state=OrderSerializer(order).data,
                request=request
            )

            # In-app notification: catalog purchase (admins only)
            try:
                from apps.notifications.models import Notification
                Notification.notify_admins(
                    notification_type=Notification.TYPE_CATALOG_PURCHASE,
                    title=f'Compra de catálogo #{order.order_number}',
                    message=f'{request.user.full_name} — ${order.total:,.2f} {order.currency}',
                    entity_type='Order',
                    entity_id=order.id,
                    action_url=f'/dashboard/pedidos/{order.id}',
                )
            except Exception:
                pass

            # Clear cart
            cart.items.all().delete()

        return Response(
            OrderSerializer(order).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel an order (customer)."""
        order = self.get_object()

        if not order.can_transition_to(Order.STATUS_CANCELLED):
            return Response(
                {'error': _('This order cannot be cancelled.')},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            old_status = order.status
            order.transition_to(
                Order.STATUS_CANCELLED,
                changed_by=request.user,
                notes=_('Cancelled by customer')
            )

            AuditLog.log(
                entity=order,
                action=AuditLog.ACTION_STATE_CHANGED,
                actor=request.user,
                before_state={'status': old_status},
                after_state={'status': order.status},
                request=request
            )

        return Response(OrderSerializer(order).data)


class OrderAdminViewSet(viewsets.ModelViewSet):
    """
    Admin/Sales ViewSet for order management.

    GET /api/v1/admin/orders/
    GET /api/v1/admin/orders/{id}/
    PUT /api/v1/admin/orders/{id}/
    POST /api/v1/admin/orders/{id}/update_status/ - Change status
    """

    queryset = Order.objects.all().prefetch_related(
        'lines', 'status_history', 'payments'
    ).select_related('user', 'pickup_branch')
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['status', 'payment_method', 'user']
    search_fields = ['order_number', 'user__email', 'user__first_name', 'user__last_name']
    ordering = ['-created_at']

    def check_permissions(self, request):
        """Only admin and sales staff can access."""
        super().check_permissions(request)
        if not is_internal_user(request.user):
            self.permission_denied(request)

    def get_serializer_class(self):
        """Return appropriate serializer."""
        if self.action == 'list':
            return OrderListSerializer
        return OrderSerializer

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update order status."""
        order = self.get_object()
        serializer = UpdateOrderStatusSerializer(
            data=request.data,
            context={'order': order}
        )
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data['status']
        notes = serializer.validated_data.get('notes', '')
        scheduled_date = serializer.validated_data.get('scheduled_date')

        with transaction.atomic():
            old_status = order.status
            order.transition_to(new_status, changed_by=request.user, notes=notes)

            # Update scheduled_date if provided
            if scheduled_date is not None:
                order.scheduled_date = scheduled_date
                order.save(update_fields=['scheduled_date'])

            # If transitioning to completed, create inventory movements
            if new_status == Order.STATUS_COMPLETED:
                for line in order.lines.all():
                    if line.metadata.get('variant_id'):
                        try:
                            variant = ProductVariant.objects.get(
                                id=line.metadata['variant_id']
                            )
                            if variant.catalog_item.track_inventory:
                                InventoryMovement.objects.create(
                                    variant=variant,
                                    movement_type=InventoryMovement.MOVEMENT_OUT,
                                    quantity=line.quantity,
                                    reason='sale',
                                    reference_type='order',
                                    reference_id=str(order.id),
                                    created_by=request.user
                                )
                        except ProductVariant.DoesNotExist:
                            pass

            AuditLog.log(
                entity=order,
                action=AuditLog.ACTION_STATE_CHANGED,
                actor=request.user,
                before_state={'status': old_status},
                after_state={'status': order.status},
                request=request,
                metadata={'notes': notes}
            )

            # In-app notifications for important status transitions
            try:
                from apps.notifications.models import Notification

                # Determine the salesperson (quote creator) if order came from a quote
                owner = order.quote.created_by if order.quote else None
                order_url = f'/dashboard/pedidos/{order.id}'

                STATUS_LABELS = {
                    'paid': 'Pagado', 'partially_paid': 'Pago parcial',
                    'in_production': 'En producción', 'ready': 'Listo',
                    'in_delivery': 'En entrega', 'completed': 'Completado',
                    'cancelled': 'Cancelado', 'refunded': 'Reembolsado',
                }
                label = STATUS_LABELS.get(new_status, new_status)

                if new_status == 'completed':
                    Notification.notify_owner_and_admins(
                        owner=owner,
                        notification_type=Notification.TYPE_ORDER_COMPLETED,
                        title=f'Pedido #{order.order_number} completado',
                        message=f'Cliente: {order.user.full_name if order.user else "N/A"}',
                        entity_type='Order',
                        entity_id=order.id,
                        action_url=order_url,
                    )
                elif new_status in ('paid', 'partially_paid'):
                    Notification.notify_owner_and_admins(
                        owner=owner,
                        notification_type=Notification.TYPE_PAYMENT_RECEIVED,
                        title=f'Pago registrado — Pedido #{order.order_number}',
                        message=f'{label} — {order.user.full_name if order.user else "N/A"}',
                        entity_type='Order',
                        entity_id=order.id,
                        action_url=order_url,
                    )
                else:
                    # Generic status change
                    Notification.notify_owner_and_admins(
                        owner=owner,
                        notification_type=Notification.TYPE_ORDER_STATUS,
                        title=f'Pedido #{order.order_number} → {label}',
                        message=f'Cliente: {order.user.full_name if order.user else "N/A"}',
                        entity_type='Order',
                        entity_id=order.id,
                        action_url=order_url,
                    )
            except Exception:
                pass

        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['post'])
    def add_tracking(self, request, pk=None):
        """Add tracking information to order."""
        order = self.get_object()
        tracking_number = request.data.get('tracking_number')
        tracking_url = request.data.get('tracking_url', '')

        if not tracking_number:
            return Response(
                {'error': _('Tracking number is required.')},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.tracking_number = tracking_number
        order.tracking_url = tracking_url
        order.save(update_fields=['tracking_number', 'tracking_url', 'updated_at'])

        AuditLog.log(
            entity=order,
            action=AuditLog.ACTION_UPDATED,
            actor=request.user,
            after_state={
                'tracking_number': tracking_number,
                'tracking_url': tracking_url
            },
            request=request
        )

        return Response(OrderSerializer(order).data)
