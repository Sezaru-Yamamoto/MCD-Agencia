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
from apps.content.models import Branch
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

MANUAL_PAYMENT_METHODS = {'bank_transfer', 'cash'}
ONLINE_PAYMENT_METHODS = {'mercadopago', 'paypal'}


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

            # Calculate totals using Decimal to avoid Decimal*float runtime errors
            subtotal = sum(item.line_total for item in cart.items.all())
            tax_rate = Decimal(str(settings.TAX_RATE))
            tax_amount = subtotal * tax_rate
            delivery_method = serializer.validated_data.get('delivery_method', Order.DELIVERY_SHIPPING)
            shipping_fee = serializer.validated_data.get('shipping_fee', Decimal('0'))
            if delivery_method == Order.DELIVERY_PICKUP:
                shipping_fee = Decimal('0')
            total = subtotal + tax_amount + shipping_fee

            pickup_branch = None
            if delivery_method == Order.DELIVERY_PICKUP and serializer.validated_data.get('pickup_branch_id'):
                pickup_branch = Branch.objects.filter(id=serializer.validated_data['pickup_branch_id'], is_active=True).first()

            # Create order
            order = Order.objects.create(
                user=request.user,
                status=Order.STATUS_PENDING_PAYMENT,
                shipping_address=shipping_address.full_address,
                billing_address=billing_address.full_address,
                subtotal=subtotal,
                tax_rate=tax_rate,
                tax_amount=tax_amount,
                total=total,
                payment_method=serializer.validated_data['payment_method'],
                notes=serializer.validated_data.get('notes', ''),
                delivery_method=delivery_method,
                pickup_branch=pickup_branch,
                delivery_address={
                    'shipping_fee': str(shipping_fee),
                    'shipping_address_id': str(shipping_address.id),
                },
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

            # Temporary simulation: online methods are auto-confirmed as paid and moved to production.
            if order.payment_method in ONLINE_PAYMENT_METHODS:
                order.amount_paid = order.total
                order.save(update_fields=['amount_paid', 'updated_at'])

                order.transition_to(
                    Order.STATUS_PAID,
                    changed_by=request.user,
                    notes=_('Simulated payment confirmation from checkout')
                )
                order.transition_to(
                    Order.STATUS_IN_PRODUCTION,
                    changed_by=request.user,
                    notes=_('Order moved to production after simulated payment')
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

    @action(detail=True, methods=['post'])
    def set_payment_method(self, request, pk=None):
        """Set customer-selected payment method for pending orders."""
        order = self.get_object()

        if order.user_id != request.user.id:
            return Response(
                {'error': _('You can only update your own orders.')},
                status=status.HTTP_403_FORBIDDEN
            )

        if order.status not in [Order.STATUS_PENDING_PAYMENT, Order.STATUS_PARTIALLY_PAID]:
            return Response(
                {'error': _('Payment method can only be changed while payment is pending.')},
                status=status.HTTP_400_BAD_REQUEST
            )

        payment_method = request.data.get('payment_method', '')
        valid_methods = {value for value, _ in Order.PAYMENT_METHOD_CHOICES}
        if payment_method not in valid_methods:
            return Response(
                {'error': _('Invalid payment method.')},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.payment_method = payment_method
        order.save(update_fields=['payment_method', 'updated_at'])

        AuditLog.log(
            entity=order,
            action=AuditLog.ACTION_UPDATED,
            actor=request.user,
            after_state={'payment_method': order.payment_method},
            request=request,
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
        user_role = getattr(getattr(request.user, 'role', None), 'name', '')
        is_admin = user_role == 'admin'

        if new_status in [Order.STATUS_PAID, Order.STATUS_PARTIALLY_PAID, Order.STATUS_REFUNDED] and not is_admin:
            return Response(
                {'error': _('Only admin can confirm or reconcile payments.')},
                status=status.HTTP_403_FORBIDDEN
            )

        if new_status == Order.STATUS_IN_PRODUCTION and not order.is_fully_paid:
            if order.payment_method in ONLINE_PAYMENT_METHODS:
                order.amount_paid = order.total
                order.save(update_fields=['amount_paid', 'updated_at'])
            elif not is_admin:
                return Response(
                    {'error': _('Order must be fully paid before starting production.')},
                    status=status.HTTP_400_BAD_REQUEST
                )
            elif not str(notes or '').strip():
                return Response(
                    {'error': _('Admin override requires notes to start production before full payment.')},
                    status=status.HTTP_400_BAD_REQUEST
                )

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


class AdminWorkflowView(APIView):
    """Unified workflow feed for admin and sales dashboards."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not is_internal_user(request.user):
            return Response(status=status.HTTP_403_FORBIDDEN)

        from datetime import timedelta

        from apps.quotes.models import QuoteRequest, Quote
        from apps.quotes.serializers import QuoteRequestAdminSerializer, QuoteAdminSerializer

        today = timezone.localdate()
        window_start = today - timedelta(days=14)
        window_end = today + timedelta(days=90)

        orders_qs = Order.objects.select_related('user', 'pickup_branch').prefetch_related('lines', 'status_history')
        requests_qs = QuoteRequest.objects.select_related('assigned_to', 'pickup_branch', 'catalog_item').prefetch_related('attachments', 'services')
        quotes_qs = Quote.objects.select_related('quote_request', 'created_by', 'pickup_branch').prefetch_related('lines', 'attachments')

        manual_payment_orders = list(
            orders_qs.filter(
                status=Order.STATUS_PENDING_PAYMENT,
                payment_method__in=MANUAL_PAYMENT_METHODS,
            ).order_by('created_at')[:10]
        )
        production_orders = list(
            orders_qs.filter(status=Order.STATUS_IN_PRODUCTION).order_by('scheduled_date', 'created_at')[:10]
        )
        ready_orders = list(
            orders_qs.filter(status__in=[Order.STATUS_READY, Order.STATUS_IN_DELIVERY]).order_by('scheduled_date', 'created_at')[:10]
        )
        completed_orders = list(
            orders_qs.filter(status=Order.STATUS_COMPLETED).order_by('-completed_at', '-created_at')[:10]
        )

        assigned_requests = list(
            requests_qs.filter(
                status__in=[QuoteRequest.STATUS_ASSIGNED, QuoteRequest.STATUS_IN_REVIEW, QuoteRequest.STATUS_QUOTED]
            ).order_by('required_date', 'created_at')[:10]
        )
        pending_requests = list(
            requests_qs.filter(
                status=QuoteRequest.STATUS_PENDING,
                assigned_to__isnull=True,
            ).order_by('created_at')[:10]
        )

        accepted_quotes = list(
            quotes_qs.filter(
                status__in=[Quote.STATUS_ACCEPTED, Quote.STATUS_SENT, Quote.STATUS_VIEWED, Quote.STATUS_CHANGES_REQUESTED]
            ).order_by('estimated_delivery_date', 'created_at')[:10]
        )

        def serialize_order(order, kind, date_value=None, date_label=''):
            return {
                'id': str(order.id),
                'kind': kind,
                'title': f'Pedido #{order.order_number}',
                'subtitle': order.user.full_name if order.user and order.user.full_name else order.user.email if order.user else 'Cliente',
                'status': order.status,
                'status_display': order.get_status_display(),
                'payment_method': order.payment_method,
                'delivery_method': order.delivery_method,
                'date': date_value.isoformat() if date_value else None,
                'date_label': date_label,
                'amount': str(order.total),
                'href': f'/dashboard/pedidos/{order.id}',
                'note': order.internal_notes or order.notes or '',
            }

        def serialize_request(request_obj, kind, date_value=None, date_label=''):
            return {
                'id': str(request_obj.id),
                'kind': kind,
                'title': f'Solicitud #{request_obj.request_number}',
                'subtitle': request_obj.customer_name,
                'status': request_obj.status,
                'status_display': request_obj.get_status_display(),
                'delivery_method': request_obj.delivery_method,
                'date': date_value.isoformat() if date_value else None,
                'date_label': date_label,
                'amount': None,
                'href': f'/dashboard/solicitudes/{request_obj.id}',
                'note': request_obj.description or '',
            }

        def serialize_quote(quote, kind, date_value=None, date_label=''):
            return {
                'id': str(quote.id),
                'kind': kind,
                'title': f'Cotización #{quote.quote_number}',
                'subtitle': quote.customer_name or quote.customer_email or 'Cliente',
                'status': quote.status,
                'status_display': quote.get_status_display(),
                'delivery_method': quote.delivery_method,
                'date': date_value.isoformat() if date_value else None,
                'date_label': date_label,
                'amount': str(quote.total),
                'href': f'/dashboard/cotizaciones/{quote.id}',
                'note': quote.payment_conditions or quote.customer_notes or '',
            }

        calendar_events = []
        for request_obj in requests_qs.filter(required_date__isnull=False, required_date__gte=window_start, required_date__lte=window_end).order_by('required_date', 'created_at')[:50]:
            calendar_events.append(serialize_request(request_obj, 'quote_request_required', request_obj.required_date, 'Fecha requerida'))

        for quote in quotes_qs.filter(estimated_delivery_date__isnull=False, estimated_delivery_date__gte=window_start, estimated_delivery_date__lte=window_end).order_by('estimated_delivery_date', 'created_at')[:50]:
            calendar_events.append(serialize_quote(quote, 'quote_estimated_delivery', quote.estimated_delivery_date, 'Entrega estimada'))

        for order in orders_qs.filter(scheduled_date__isnull=False, scheduled_date__date__gte=window_start, scheduled_date__date__lte=window_end).order_by('scheduled_date', 'created_at')[:50]:
            calendar_events.append(serialize_order(order, 'order_scheduled', order.scheduled_date.date(), 'Programado'))

        for order in orders_qs.filter(completed_at__isnull=False, completed_at__date__gte=window_start, completed_at__date__lte=window_end).order_by('-completed_at', '-created_at')[:50]:
            calendar_events.append(serialize_order(order, 'order_completed', order.completed_at.date(), 'Completado'))

        calendar_events.sort(key=lambda item: (item['date'] or '', item['title']))

        blocks = {
            'assigned': [serialize_request(request_obj, 'quote_request_assigned', request_obj.required_date, 'Fecha requerida') for request_obj in assigned_requests],
            'to_pay': [serialize_order(order, 'order_pending_payment') for order in manual_payment_orders],
            'in_production': [serialize_order(order, 'order_in_production', order.scheduled_date.date() if order.scheduled_date else None, 'Programado') for order in production_orders],
            'ready': [serialize_order(order, 'order_ready', order.scheduled_date.date() if order.scheduled_date else None, 'Programado') for order in ready_orders],
            'done': [serialize_order(order, 'order_completed', order.completed_at.date() if order.completed_at else None, 'Completado') for order in completed_orders],
            'quotes': [serialize_request(request_obj, 'quote_request_pending', request_obj.required_date, 'Fecha requerida') for request_obj in pending_requests],
        }

        stats = {
            'manual_payment_orders': len(manual_payment_orders),
            'in_production_orders': len(production_orders),
            'ready_orders': len(ready_orders),
            'completed_orders': len(completed_orders),
            'assigned_requests': len(assigned_requests),
            'pending_requests': len(pending_requests),
            'calendar_items': len(calendar_events),
        }

        return Response({
            'generated_at': timezone.now().isoformat(),
            'window_start': window_start.isoformat(),
            'window_end': window_end.isoformat(),
            'stats': stats,
            'blocks': blocks,
            'calendar_events': calendar_events,
            'quotes': QuoteAdminSerializer(accepted_quotes, many=True).data,
            'quote_requests': QuoteRequestAdminSerializer(assigned_requests, many=True).data,
        })
