"""
Payment Views for MCD-Agencia.

This module provides ViewSets for payment operations:
    - Payment initiation
    - Webhook handling
    - Refund management
"""

import hashlib
import hmac
import json
import logging

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from apps.audit.models import AuditLog
from apps.core.pagination import StandardPagination
from .models import Payment, PaymentWebhookLog, Refund
from .serializers import (
    PaymentSerializer,
    PaymentListSerializer,
    CreatePaymentSerializer,
    MercadoPagoPreferenceSerializer,
    PayPalOrderSerializer,
    RefundSerializer,
    CreateRefundSerializer,
    PaymentWebhookLogSerializer,
    PaymentSummarySerializer,
)

logger = logging.getLogger(__name__)


class PaymentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for payment management.

    Customer endpoints:
        GET /api/v1/payments/ - List user's payments
        GET /api/v1/payments/{id}/ - Payment details
        POST /api/v1/payments/initiate/ - Start payment

    Admin endpoints:
        GET /api/v1/admin/payments/ - List all payments
    """

    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'provider']

    def get_queryset(self):
        """Return payments based on user role."""
        if self.request.user.is_staff:
            return Payment.objects.all().select_related('order', 'quote', 'user')
        return Payment.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        """Return appropriate serializer."""
        if self.action == 'list':
            return PaymentListSerializer
        return PaymentSerializer

    @action(detail=False, methods=['post'])
    def initiate(self, request):
        """Initiate a payment."""
        serializer = CreatePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        provider = serializer.validated_data['provider']
        order = serializer.validated_data.get('order')
        quote = serializer.validated_data.get('quote')

        # Determine amount
        if order:
            amount = order.balance_due
            entity_type = 'order'
            entity = order
        else:
            amount = quote.total
            entity_type = 'quote'
            entity = quote

        # Create payment record
        payment = Payment.objects.create(
            order=order,
            quote=quote,
            user=request.user,
            provider=provider,
            amount=amount,
            status=Payment.STATUS_PENDING,
            ip_address=self._get_client_ip(request)
        )

        # Generate payment based on provider
        if provider == Payment.PROVIDER_MERCADOPAGO:
            result = self._create_mercadopago_preference(payment, entity, entity_type)
        else:  # PayPal
            result = self._create_paypal_order(payment, entity, entity_type)

        if 'error' in result:
            payment.status = Payment.STATUS_REJECTED
            payment.error_message = result['error']
            payment.save(update_fields=['status', 'error_message', 'updated_at'])
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        AuditLog.log(
            entity=payment,
            action=AuditLog.ACTION_CREATED,
            actor=request.user,
            after_state=PaymentSerializer(payment).data,
            request=request
        )

        return Response({
            'payment_id': str(payment.id),
            **result
        })

    def _create_mercadopago_preference(self, payment, entity, entity_type):
        """Create Mercado Pago preference."""
        try:
            # Note: In production, use actual Mercado Pago SDK
            # This is a placeholder implementation
            import uuid

            preference_id = str(uuid.uuid4())
            init_point = f"https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id={preference_id}"

            payment.provider_order_id = preference_id
            payment.save(update_fields=['provider_order_id', 'updated_at'])

            return {
                'preference_id': preference_id,
                'init_point': init_point,
                'sandbox_init_point': init_point.replace('www', 'sandbox')
            }
        except Exception as e:
            logger.error(f"Mercado Pago error: {str(e)}")
            return {'error': str(e)}

    def _create_paypal_order(self, payment, entity, entity_type):
        """Create PayPal order."""
        try:
            # Note: In production, use actual PayPal SDK
            # This is a placeholder implementation
            import uuid

            order_id = str(uuid.uuid4())
            approval_url = f"https://www.paypal.com/checkoutnow?token={order_id}"

            payment.provider_order_id = order_id
            payment.save(update_fields=['provider_order_id', 'updated_at'])

            return {
                'order_id': order_id,
                'approval_url': approval_url
            }
        except Exception as e:
            logger.error(f"PayPal error: {str(e)}")
            return {'error': str(e)}

    def _get_client_ip(self, request):
        """Get client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')

    @action(detail=True, methods=['get'])
    def check_status(self, request, pk=None):
        """Check payment status."""
        payment = self.get_object()
        return Response({
            'status': payment.status,
            'is_successful': payment.is_successful
        })


class MercadoPagoWebhookView(APIView):
    """
    Handle Mercado Pago webhooks.

    POST /api/v1/payments/webhooks/mercadopago/
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        """Process Mercado Pago webhook."""
        # Log webhook
        webhook_log = PaymentWebhookLog.objects.create(
            provider=Payment.PROVIDER_MERCADOPAGO,
            event_type=request.data.get('type', 'unknown'),
            event_id=request.data.get('data', {}).get('id', 'unknown'),
            payload=request.data,
            headers=dict(request.headers),
            ip_address=self._get_client_ip(request)
        )

        try:
            # Verify signature (in production)
            # self._verify_signature(request)

            event_type = request.data.get('type')
            data = request.data.get('data', {})

            if event_type == 'payment':
                self._handle_payment_notification(data, webhook_log)

            webhook_log.processed = True
            webhook_log.save(update_fields=['processed', 'updated_at'])

        except Exception as e:
            logger.error(f"Webhook processing error: {str(e)}")
            webhook_log.processing_error = str(e)
            webhook_log.save(update_fields=['processing_error', 'updated_at'])

        # Always return 200 to acknowledge receipt
        return Response({'status': 'ok'})

    def _handle_payment_notification(self, data, webhook_log):
        """Handle payment status notification."""
        payment_id = data.get('id')

        if not payment_id:
            return

        # Find payment by provider ID
        try:
            payment = Payment.objects.get(
                provider=Payment.PROVIDER_MERCADOPAGO,
                provider_order_id=payment_id
            )
        except Payment.DoesNotExist:
            payment = Payment.objects.filter(
                provider=Payment.PROVIDER_MERCADOPAGO,
                provider_payment_id=payment_id
            ).first()

        if not payment:
            logger.warning(f"Payment not found for MP ID: {payment_id}")
            return

        webhook_log.payment = payment
        webhook_log.save(update_fields=['payment'])

        # Update payment status based on webhook data
        # In production, fetch actual status from Mercado Pago API
        status_map = {
            'approved': Payment.STATUS_APPROVED,
            'pending': Payment.STATUS_PENDING,
            'rejected': Payment.STATUS_REJECTED,
            'cancelled': Payment.STATUS_CANCELLED,
        }

        new_status = status_map.get(data.get('status'), payment.status)

        with transaction.atomic():
            if payment.status != new_status:
                payment.status = new_status
                if new_status == Payment.STATUS_APPROVED:
                    payment.approved_at = timezone.now()
                    self._process_successful_payment(payment)
                payment.save()

                AuditLog.log(
                    entity=payment,
                    action=AuditLog.ACTION_PAYMENT_PROCESSED,
                    after_state=PaymentSerializer(payment).data,
                    metadata={'webhook': True, 'provider': 'mercadopago'}
                )

    def _process_successful_payment(self, payment):
        """Process successful payment."""
        if payment.order:
            order = payment.order
            order.amount_paid += payment.amount
            if order.is_fully_paid:
                order.transition_to(
                    'paid',
                    notes='Payment completed via Mercado Pago'
                )
                order.paid_at = timezone.now()
            order.save()

    def _get_client_ip(self, request):
        """Get client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')


class PayPalWebhookView(APIView):
    """
    Handle PayPal webhooks.

    POST /api/v1/payments/webhooks/paypal/
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        """Process PayPal webhook."""
        # Log webhook
        webhook_log = PaymentWebhookLog.objects.create(
            provider=Payment.PROVIDER_PAYPAL,
            event_type=request.data.get('event_type', 'unknown'),
            event_id=request.data.get('id', 'unknown'),
            payload=request.data,
            headers=dict(request.headers),
            ip_address=self._get_client_ip(request)
        )

        try:
            # Verify webhook (in production)
            # self._verify_webhook(request)

            event_type = request.data.get('event_type')
            resource = request.data.get('resource', {})

            if event_type in ['PAYMENT.CAPTURE.COMPLETED', 'CHECKOUT.ORDER.APPROVED']:
                self._handle_payment_completed(resource, webhook_log)

            webhook_log.processed = True
            webhook_log.save(update_fields=['processed', 'updated_at'])

        except Exception as e:
            logger.error(f"PayPal webhook error: {str(e)}")
            webhook_log.processing_error = str(e)
            webhook_log.save(update_fields=['processing_error', 'updated_at'])

        return Response({'status': 'ok'})

    def _handle_payment_completed(self, resource, webhook_log):
        """Handle payment completed notification."""
        order_id = resource.get('id')

        try:
            payment = Payment.objects.get(
                provider=Payment.PROVIDER_PAYPAL,
                provider_order_id=order_id
            )
        except Payment.DoesNotExist:
            logger.warning(f"Payment not found for PayPal order: {order_id}")
            return

        webhook_log.payment = payment
        webhook_log.save(update_fields=['payment'])

        with transaction.atomic():
            payment.status = Payment.STATUS_APPROVED
            payment.approved_at = timezone.now()
            payment.provider_payment_id = resource.get('purchase_units', [{}])[0].get(
                'payments', {}
            ).get('captures', [{}])[0].get('id', '')
            payment.save()

            # Process order payment
            if payment.order:
                order = payment.order
                order.amount_paid += payment.amount
                if order.is_fully_paid:
                    order.transition_to(
                        'paid',
                        notes='Payment completed via PayPal'
                    )
                    order.paid_at = timezone.now()
                order.save()

            AuditLog.log(
                entity=payment,
                action=AuditLog.ACTION_PAYMENT_PROCESSED,
                after_state=PaymentSerializer(payment).data,
                metadata={'webhook': True, 'provider': 'paypal'}
            )

    def _get_client_ip(self, request):
        """Get client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')


class RefundViewSet(viewsets.ModelViewSet):
    """
    ViewSet for refund management.

    GET /api/v1/admin/refunds/
    POST /api/v1/admin/refunds/
    GET /api/v1/admin/refunds/{id}/
    """

    queryset = Refund.objects.select_related('payment', 'processed_by')
    serializer_class = RefundSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'reason']

    def get_serializer_class(self):
        """Return appropriate serializer."""
        if self.action == 'create':
            return CreateRefundSerializer
        return RefundSerializer

    def create(self, request, *args, **kwargs):
        """Create a refund."""
        serializer = CreateRefundSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payment = serializer.validated_data['payment']

        with transaction.atomic():
            refund = Refund.objects.create(
                payment=payment,
                amount=serializer.validated_data['amount'],
                reason=serializer.validated_data['reason'],
                reason_details=serializer.validated_data.get('reason_details', ''),
                processed_by=request.user,
                processed_at=timezone.now()
            )

            # In production, process refund via payment provider
            # For now, mark as approved
            refund.status = Refund.STATUS_APPROVED
            refund.save(update_fields=['status', 'updated_at'])

            # Update payment status if fully refunded
            total_refunded = sum(
                r.amount for r in payment.refunds.filter(status=Refund.STATUS_APPROVED)
            )
            if total_refunded >= payment.amount:
                payment.status = Payment.STATUS_REFUNDED
                payment.save(update_fields=['status', 'updated_at'])

            AuditLog.log(
                entity=refund,
                action=AuditLog.ACTION_CREATED,
                actor=request.user,
                after_state=RefundSerializer(refund).data,
                request=request
            )

        return Response(
            RefundSerializer(refund).data,
            status=status.HTTP_201_CREATED
        )


class PaymentSummaryView(APIView):
    """
    Get payment summary report.

    GET /api/v1/admin/payments/summary/
    """

    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        """Get payment summary."""
        from django.db.models import Sum, Count

        # Get date filters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        payments = Payment.objects.filter(status=Payment.STATUS_APPROVED)

        if start_date:
            payments = payments.filter(created_at__gte=start_date)
        if end_date:
            payments = payments.filter(created_at__lte=end_date)

        # Calculate totals
        totals = payments.aggregate(
            total_amount=Sum('amount'),
            total_fees=Sum('fee_amount'),
            total_net=Sum('net_amount'),
            count=Count('id')
        )

        # By provider
        by_provider = {}
        for provider, label in Payment.PROVIDER_CHOICES:
            provider_data = payments.filter(provider=provider).aggregate(
                amount=Sum('amount'),
                count=Count('id')
            )
            by_provider[provider] = {
                'amount': float(provider_data['amount'] or 0),
                'count': provider_data['count'] or 0
            }

        # By status (all payments)
        all_payments = Payment.objects.all()
        if start_date:
            all_payments = all_payments.filter(created_at__gte=start_date)
        if end_date:
            all_payments = all_payments.filter(created_at__lte=end_date)

        by_status = {}
        for status_code, label in Payment.STATUS_CHOICES:
            by_status[status_code] = all_payments.filter(status=status_code).count()

        # By payment method
        by_method = {}
        for payment in payments:
            method = payment.payment_method_type or 'unknown'
            if method not in by_method:
                by_method[method] = {'amount': 0, 'count': 0}
            by_method[method]['amount'] += float(payment.amount)
            by_method[method]['count'] += 1

        # Total refunds
        refunds = Refund.objects.filter(status=Refund.STATUS_APPROVED)
        if start_date:
            refunds = refunds.filter(created_at__gte=start_date)
        if end_date:
            refunds = refunds.filter(created_at__lte=end_date)
        total_refunds = refunds.aggregate(total=Sum('amount'))['total'] or 0

        return Response({
            'total_payments': totals['count'] or 0,
            'total_amount': float(totals['total_amount'] or 0),
            'total_fees': float(totals['total_fees'] or 0),
            'total_net': float(totals['total_net'] or 0),
            'total_refunds': float(total_refunds),
            'by_provider': by_provider,
            'by_status': by_status,
            'by_method': by_method
        })
