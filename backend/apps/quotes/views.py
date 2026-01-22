"""
Quote Views for MCD-Agencia.

This module provides ViewSets for quote operations:
    - Quote request submission (public)
    - Quote management (admin)
    - Quote acceptance (customer)
"""

from django.db import transaction
from django.http import FileResponse, Http404
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from apps.audit.models import AuditLog
from apps.core.pagination import StandardPagination
from .models import QuoteRequest, Quote, QuoteLine, QuoteAttachment
from .serializers import (
    QuoteRequestSerializer,
    QuoteRequestCreateSerializer,
    QuoteRequestAdminSerializer,
    QuoteSerializer,
    QuoteAdminSerializer,
    QuoteCreateSerializer,
    QuoteLineSerializer,
    QuoteSendSerializer,
    QuoteAcceptSerializer,
)


class QuoteRequestPublicView(APIView):
    """
    Public endpoint for quote request submission.

    POST /api/v1/quotes/request/
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        """Submit a new quote request."""
        serializer = QuoteRequestCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        quote_request = serializer.save()

        # Log creation
        AuditLog.log(
            entity=quote_request,
            action=AuditLog.ACTION_CREATED,
            after_state=QuoteRequestSerializer(quote_request).data,
            request=request,
            metadata={'source': 'public_form'}
        )

        return Response(
            {
                'message': _('Your quote request has been submitted. We will contact you soon.'),
                'request_number': quote_request.request_number
            },
            status=status.HTTP_201_CREATED
        )


class QuoteRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for quote request management.

    Customer endpoints:
        GET /api/v1/quotes/requests/ - List user's requests
        GET /api/v1/quotes/requests/{id}/ - Request details

    Admin endpoints:
        GET /api/v1/admin/quote-requests/ - List all requests
        PUT /api/v1/admin/quote-requests/{id}/ - Update request
        POST /api/v1/admin/quote-requests/{id}/assign/ - Assign to sales
    """

    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'assigned_to']

    def get_queryset(self):
        """Return requests based on user role."""
        if self.request.user.is_staff:
            return QuoteRequest.objects.all().select_related(
                'catalog_item', 'assigned_to'
            )
        return QuoteRequest.objects.filter(
            email=self.request.user.email,
            is_deleted=False
        ).select_related('catalog_item')

    def get_serializer_class(self):
        """Return appropriate serializer."""
        if self.request.user.is_staff:
            return QuoteRequestAdminSerializer
        return QuoteRequestSerializer

    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        """Assign quote request to sales rep (admin)."""
        if not request.user.is_staff:
            return Response(status=status.HTTP_403_FORBIDDEN)

        quote_request = self.get_object()
        assigned_to_id = request.data.get('assigned_to_id')

        if not assigned_to_id:
            return Response(
                {'error': _('assigned_to_id is required.')},
                status=status.HTTP_400_BAD_REQUEST
            )

        from django.contrib.auth import get_user_model
        User = get_user_model()

        try:
            assigned_to = User.objects.get(id=assigned_to_id, is_active=True)
        except User.DoesNotExist:
            return Response(
                {'error': _('User not found.')},
                status=status.HTTP_404_NOT_FOUND
            )

        quote_request.assigned_to = assigned_to
        quote_request.save(update_fields=['assigned_to', 'updated_at'])

        AuditLog.log(
            entity=quote_request,
            action=AuditLog.ACTION_UPDATED,
            actor=request.user,
            after_state={'assigned_to': str(assigned_to.id)},
            request=request
        )

        return Response(QuoteRequestAdminSerializer(quote_request).data)

    @action(detail=True, methods=['post'])
    def mark_in_review(self, request, pk=None):
        """Mark request as in review (admin)."""
        if not request.user.is_staff:
            return Response(status=status.HTTP_403_FORBIDDEN)

        quote_request = self.get_object()
        quote_request.status = QuoteRequest.STATUS_IN_REVIEW
        quote_request.save(update_fields=['status', 'updated_at'])

        AuditLog.log(
            entity=quote_request,
            action=AuditLog.ACTION_STATE_CHANGED,
            actor=request.user,
            after_state={'status': quote_request.status},
            request=request
        )

        return Response(QuoteRequestAdminSerializer(quote_request).data)


class QuoteViewSet(viewsets.ModelViewSet):
    """
    ViewSet for quote management.

    Customer endpoints:
        GET /api/v1/quotes/ - List user's quotes
        GET /api/v1/quotes/{id}/ - Quote details
        POST /api/v1/quotes/{id}/accept/ - Accept quote

    Admin endpoints:
        GET /api/v1/admin/quotes/ - List all quotes
        POST /api/v1/admin/quotes/ - Create quote
        PUT /api/v1/admin/quotes/{id}/ - Update quote
        POST /api/v1/admin/quotes/{id}/send/ - Send to customer
    """

    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status']

    def get_queryset(self):
        """Return quotes based on user role."""
        if self.request.user.is_staff:
            return Quote.objects.all().select_related(
                'quote_request', 'created_by'
            ).prefetch_related('lines')
        return Quote.objects.filter(
            quote_request__email=self.request.user.email,
            is_deleted=False,
            status__in=[
                Quote.STATUS_SENT,
                Quote.STATUS_VIEWED,
                Quote.STATUS_ACCEPTED,
                Quote.STATUS_REJECTED
            ]
        ).prefetch_related('lines')

    def get_serializer_class(self):
        """Return appropriate serializer."""
        if self.action == 'create':
            return QuoteCreateSerializer
        if self.request.user.is_staff:
            return QuoteAdminSerializer
        return QuoteSerializer

    def perform_create(self, serializer):
        """Create quote (admin only)."""
        quote = serializer.save(created_by=self.request.user)

        AuditLog.log(
            entity=quote,
            action=AuditLog.ACTION_CREATED,
            actor=self.request.user,
            after_state=QuoteAdminSerializer(quote).data,
            request=self.request
        )

    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        """Send quote to customer (admin)."""
        if not request.user.is_staff:
            return Response(status=status.HTTP_403_FORBIDDEN)

        quote = self.get_object()

        if quote.status not in [Quote.STATUS_DRAFT]:
            return Response(
                {'error': _('Only draft quotes can be sent.')},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = QuoteSendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            quote.status = Quote.STATUS_SENT
            quote.sent_at = timezone.now()

            # Update validity if provided
            if 'valid_until' in serializer.validated_data:
                quote.valid_until = serializer.validated_data['valid_until']

            quote.save(update_fields=['status', 'sent_at', 'valid_until', 'updated_at'])

            # Update quote request status
            if quote.quote_request:
                quote.quote_request.status = QuoteRequest.STATUS_QUOTED
                quote.quote_request.save(update_fields=['status', 'updated_at'])

            AuditLog.log(
                entity=quote,
                action=AuditLog.ACTION_STATE_CHANGED,
                actor=request.user,
                after_state={'status': quote.status, 'sent_at': str(quote.sent_at)},
                request=request
            )

            # TODO: Send email notification to customer

        return Response(QuoteAdminSerializer(quote).data)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Accept a quote (customer)."""
        quote = self.get_object()

        if quote.status not in [Quote.STATUS_SENT, Quote.STATUS_VIEWED]:
            return Response(
                {'error': _('This quote cannot be accepted.')},
                status=status.HTTP_400_BAD_REQUEST
            )

        if quote.is_expired:
            return Response(
                {'error': _('This quote has expired.')},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = QuoteAcceptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            quote.status = Quote.STATUS_ACCEPTED
            quote.accepted_at = timezone.now()
            quote.customer_notes = serializer.validated_data.get('notes', '')
            quote.save(update_fields=[
                'status', 'accepted_at', 'customer_notes', 'updated_at'
            ])

            # Update quote request status
            if quote.quote_request:
                quote.quote_request.status = QuoteRequest.STATUS_ACCEPTED
                quote.quote_request.save(update_fields=['status', 'updated_at'])

            AuditLog.log(
                entity=quote,
                action=AuditLog.ACTION_STATE_CHANGED,
                actor=request.user,
                after_state={'status': quote.status, 'accepted_at': str(quote.accepted_at)},
                request=request
            )

            # TODO: Send notification to sales team

        return Response(QuoteSerializer(quote).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a quote (customer)."""
        quote = self.get_object()

        if quote.status not in [Quote.STATUS_SENT, Quote.STATUS_VIEWED]:
            return Response(
                {'error': _('This quote cannot be rejected.')},
                status=status.HTTP_400_BAD_REQUEST
            )

        reason = request.data.get('reason', '')

        with transaction.atomic():
            quote.status = Quote.STATUS_REJECTED
            quote.customer_notes = reason
            quote.save(update_fields=['status', 'customer_notes', 'updated_at'])

            # Update quote request status
            if quote.quote_request:
                quote.quote_request.status = QuoteRequest.STATUS_REJECTED
                quote.quote_request.save(update_fields=['status', 'updated_at'])

            AuditLog.log(
                entity=quote,
                action=AuditLog.ACTION_STATE_CHANGED,
                actor=request.user,
                after_state={'status': quote.status, 'reason': reason},
                request=request
            )

        return Response(QuoteSerializer(quote).data)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplicate a quote (admin)."""
        if not request.user.is_staff:
            return Response(status=status.HTTP_403_FORBIDDEN)

        original = self.get_object()

        with transaction.atomic():
            # Create new quote
            new_quote = Quote.objects.create(
                quote_request=original.quote_request,
                created_by=request.user,
                status=Quote.STATUS_DRAFT,
                subtotal=original.subtotal,
                tax_rate=original.tax_rate,
                tax_amount=original.tax_amount,
                total=original.total,
                terms=original.terms,
                terms_en=original.terms_en,
                internal_notes=f"Duplicated from {original.quote_number}"
            )

            # Copy lines
            for line in original.lines.all():
                QuoteLine.objects.create(
                    quote=new_quote,
                    concept=line.concept,
                    concept_en=line.concept_en,
                    description=line.description,
                    description_en=line.description_en,
                    quantity=line.quantity,
                    unit=line.unit,
                    unit_price=line.unit_price,
                    line_total=line.line_total,
                    position=line.position
                )

            AuditLog.log(
                entity=new_quote,
                action=AuditLog.ACTION_CREATED,
                actor=request.user,
                after_state=QuoteAdminSerializer(new_quote).data,
                request=request,
                metadata={'duplicated_from': str(original.id)}
            )

        return Response(
            QuoteAdminSerializer(new_quote).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """Download quote PDF."""
        quote = self.get_object()

        # Check if PDF exists
        if not quote.pdf_file:
            # Generate PDF on the fly
            from apps.quotes.tasks import generate_quote_pdf
            generate_quote_pdf(str(quote.id))
            quote.refresh_from_db()

        if not quote.pdf_file:
            return Response(
                {'error': _('PDF not available.')},
                status=status.HTTP_404_NOT_FOUND
            )

        return FileResponse(
            quote.pdf_file.open('rb'),
            as_attachment=True,
            filename=f'cotizacion_{quote.quote_number}.pdf'
        )

    @action(detail=True, methods=['post'], url_path='regenerate-pdf')
    def regenerate_pdf(self, request, pk=None):
        """Regenerate quote PDF (admin)."""
        if not request.user.is_staff:
            return Response(status=status.HTTP_403_FORBIDDEN)

        quote = self.get_object()

        # Trigger PDF regeneration
        from apps.quotes.tasks import generate_quote_pdf
        generate_quote_pdf.delay(str(quote.id))

        return Response({'message': _('PDF regeneration started.')})


class QuotePublicView(APIView):
    """
    Public view for quotes via secure token.

    GET /api/v1/quotes/view/{token}/
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        """View quote via secure token."""
        try:
            quote = Quote.objects.select_related(
                'quote_request'
            ).prefetch_related('lines', 'attachments').get(
                token=token,
                status__in=[
                    Quote.STATUS_SENT,
                    Quote.STATUS_VIEWED,
                    Quote.STATUS_ACCEPTED,
                    Quote.STATUS_REJECTED
                ]
            )
        except Quote.DoesNotExist:
            return Response(
                {'error': _('Quote not found.')},
                status=status.HTTP_404_NOT_FOUND
            )

        # Mark as viewed if first time
        if quote.status == Quote.STATUS_SENT:
            quote.status = Quote.STATUS_VIEWED
            quote.viewed_at = timezone.now()
            quote.save(update_fields=['status', 'viewed_at', 'updated_at'])

            AuditLog.log(
                entity=quote,
                action=AuditLog.ACTION_VIEWED,
                request=request,
                metadata={'viewed_via': 'token_link'}
            )

        return Response(QuoteSerializer(quote).data)
