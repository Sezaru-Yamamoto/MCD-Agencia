"""
Chatbot Views for MCD-Agencia.

This module provides ViewSets for chatbot operations:
    - Lead management
    - Conversation handling
    - Chat messaging (AI-powered via pluggable providers)
    - Web chat widget config & messaging endpoints
"""

import logging

from django.db.models import Count, Q
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from apps.audit.models import AuditLog
from apps.core.pagination import StandardPagination
from .models import Lead, Conversation, Message
from .serializers import (
    LeadSerializer,
    LeadListSerializer,
    CreateLeadSerializer,
    UpdateLeadStatusSerializer,
    AssignLeadSerializer,
    ConversationSerializer,
    ConversationListSerializer,
    MessageSerializer,
    ChatMessageSerializer,
    ChatResponseSerializer,
    EscalateConversationSerializer,
    CloseConversationSerializer,
    LeadStatsSerializer,
)
from .services import get_ai_service

logger = logging.getLogger(__name__)


class LeadViewSet(viewsets.ModelViewSet):
    """
    ViewSet for lead management.

    GET /api/v1/chatbot/leads/
    POST /api/v1/chatbot/leads/
    GET /api/v1/chatbot/leads/{id}/
    PUT /api/v1/chatbot/leads/{id}/
    """

    queryset = Lead.objects.select_related('assigned_to', 'user')
    permission_classes = [permissions.IsAdminUser]
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'source', 'assigned_to']
    search_fields = ['name', 'email', 'company']
    ordering = ['-created_at']

    def get_serializer_class(self):
        """Return appropriate serializer."""
        if self.action == 'list':
            return LeadListSerializer
        if self.action == 'create':
            return CreateLeadSerializer
        return LeadSerializer

    def perform_create(self, serializer):
        """Create lead with audit logging."""
        lead = serializer.save()
        AuditLog.log(
            entity=lead,
            action=AuditLog.ACTION_CREATED,
            actor=self.request.user,
            after_state=LeadSerializer(lead).data,
            request=self.request
        )

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update lead status."""
        lead = self.get_object()
        serializer = UpdateLeadStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old_status = lead.status
        lead.status = serializer.validated_data['status']

        if 'notes' in serializer.validated_data:
            lead.notes = f"{lead.notes}\n\n[{timezone.now().strftime('%Y-%m-%d %H:%M')}] Status changed to {lead.status}: {serializer.validated_data['notes']}"

        lead.save(update_fields=['status', 'notes', 'updated_at'])

        AuditLog.log(
            entity=lead,
            action=AuditLog.ACTION_STATE_CHANGED,
            actor=request.user,
            before_state={'status': old_status},
            after_state={'status': lead.status},
            request=request
        )

        return Response(LeadSerializer(lead).data)

    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        """Assign lead to sales rep."""
        lead = self.get_object()
        serializer = AssignLeadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from django.contrib.auth import get_user_model
        User = get_user_model()

        assigned_to = User.objects.get(id=serializer.validated_data['assigned_to_id'])
        lead.assigned_to = assigned_to
        lead.save(update_fields=['assigned_to', 'updated_at'])

        AuditLog.log(
            entity=lead,
            action=AuditLog.ACTION_UPDATED,
            actor=request.user,
            after_state={'assigned_to': str(assigned_to.id)},
            request=request
        )

        return Response(LeadSerializer(lead).data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get lead statistics."""
        # Get date range
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timezone.timedelta(days=days)

        leads = Lead.objects.filter(created_at__gte=start_date)

        # Count by status
        status_counts = leads.values('status').annotate(count=Count('id'))
        by_status = {item['status']: item['count'] for item in status_counts}

        # Count by source
        source_counts = leads.values('source').annotate(count=Count('id'))
        by_source = {item['source']: item['count'] for item in source_counts}

        # Calculate conversion rate
        total = leads.count()
        converted = leads.filter(status='converted').count()
        conversion_rate = (converted / total * 100) if total > 0 else 0

        # By date
        from django.db.models.functions import TruncDate
        by_date = list(
            leads.annotate(
                date=TruncDate('created_at')
            ).values('date').annotate(
                count=Count('id')
            ).order_by('date')
        )

        return Response({
            'total_leads': total,
            'new_leads': by_status.get('new', 0),
            'contacted_leads': by_status.get('contacted', 0),
            'qualified_leads': by_status.get('qualified', 0),
            'converted_leads': converted,
            'lost_leads': by_status.get('lost', 0),
            'conversion_rate': round(conversion_rate, 2),
            'by_source': by_source,
            'by_date': [
                {'date': str(item['date']), 'count': item['count']}
                for item in by_date
            ]
        })


class PublicLeadCreateView(APIView):
    """
    Public endpoint for creating leads.

    POST /api/v1/chatbot/leads/create/
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        """Create a new lead from public form."""
        serializer = CreateLeadSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        lead = serializer.save()

        AuditLog.log(
            entity=lead,
            action=AuditLog.ACTION_CREATED,
            request=request,
            metadata={'source': 'public_form'}
        )

        return Response(
            {'message': _('Thank you! We will contact you soon.')},
            status=status.HTTP_201_CREATED
        )


class ConversationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for conversation management.

    GET /api/v1/chatbot/conversations/
    GET /api/v1/chatbot/conversations/{id}/
    POST /api/v1/chatbot/conversations/{id}/escalate/
    POST /api/v1/chatbot/conversations/{id}/close/
    """

    queryset = Conversation.objects.select_related(
        'lead', 'user', 'escalated_to'
    ).prefetch_related('messages')
    permission_classes = [permissions.IsAdminUser]
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'channel']
    ordering = ['-updated_at']

    def get_serializer_class(self):
        """Return appropriate serializer."""
        if self.action == 'list':
            return ConversationListSerializer
        return ConversationSerializer

    @action(detail=True, methods=['post'])
    def escalate(self, request, pk=None):
        """Escalate conversation to human agent."""
        conversation = self.get_object()

        if conversation.status == Conversation.STATUS_ESCALATED:
            return Response(
                {'error': _('Conversation is already escalated.')},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = EscalateConversationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        conversation.status = Conversation.STATUS_ESCALATED
        conversation.escalated_to = request.user
        conversation.escalated_at = timezone.now()
        conversation.save(update_fields=[
            'status', 'escalated_to', 'escalated_at', 'updated_at'
        ])

        # Add system message
        Message.objects.create(
            conversation=conversation,
            role='system',
            content=_('Conversation escalated to human agent.'),
            metadata={'reason': serializer.validated_data.get('reason', '')}
        )

        return Response(ConversationSerializer(conversation).data)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """Close a conversation."""
        conversation = self.get_object()

        if conversation.status == Conversation.STATUS_CLOSED:
            return Response(
                {'error': _('Conversation is already closed.')},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = CloseConversationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        conversation.status = Conversation.STATUS_CLOSED
        conversation.closed_at = timezone.now()
        conversation.save(update_fields=['status', 'closed_at', 'updated_at'])

        # Add system message
        Message.objects.create(
            conversation=conversation,
            role='system',
            content=_('Conversation closed.'),
            metadata={'resolution': serializer.validated_data.get('resolution', '')}
        )

        return Response(ConversationSerializer(conversation).data)

    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """Send a message as human agent."""
        conversation = self.get_object()

        content = request.data.get('content')
        if not content:
            return Response(
                {'error': _('Content is required.')},
                status=status.HTTP_400_BAD_REQUEST
            )

        message = Message.objects.create(
            conversation=conversation,
            role='agent',
            content=content
        )

        # Update conversation status if waiting
        if conversation.status == Conversation.STATUS_WAITING:
            conversation.status = Conversation.STATUS_ACTIVE
            conversation.save(update_fields=['status', 'updated_at'])

        return Response(MessageSerializer(message).data)

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get active conversations."""
        conversations = self.queryset.filter(
            status__in=[
                Conversation.STATUS_ACTIVE,
                Conversation.STATUS_WAITING,
                Conversation.STATUS_ESCALATED
            ]
        )
        page = self.paginate_queryset(conversations)
        if page is not None:
            serializer = ConversationListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = ConversationListSerializer(conversations, many=True)
        return Response(serializer.data)


class ChatView(APIView):
    """
    Public chat endpoint for chatbot interactions.

    POST /api/v1/chatbot/chat/
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        """Process chat message and return response."""
        serializer = ChatMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session_id = serializer.validated_data['session_id']
        content = serializer.validated_data['content']
        metadata = serializer.validated_data.get('metadata', {})

        # Get or create conversation
        conversation, created = Conversation.objects.get_or_create(
            session_id=session_id,
            defaults={
                'channel': 'web',
                'status': Conversation.STATUS_ACTIVE,
                'metadata': metadata
            }
        )

        # Store user message
        user_message = Message.objects.create(
            conversation=conversation,
            role='user',
            content=content,
            metadata=metadata
        )

        # Generate AI response
        ai_service = get_ai_service()

        # Build history from conversation
        history = list(
            conversation.messages
            .order_by('-created_at')[:8]
            .values('role', 'content')
        )
        history.reverse()
        # Map 'bot' role to 'assistant' for AI service
        for msg in history:
            if msg['role'] == 'bot':
                msg['role'] = 'assistant'

        language = metadata.get('language', 'es')
        response_data = ai_service.generate_response(
            message=content,
            history=history,
            language=language,
            session_id=session_id,
        )

        # Store bot message
        bot_message = Message.objects.create(
            conversation=conversation,
            role='bot',
            content=response_data.content,
            intent=response_data.intent,
            confidence=response_data.confidence,
            metadata=response_data.metadata,
        )

        # Update conversation
        conversation.save(update_fields=['updated_at'])

        return Response({
            'session_id': session_id,
            'content': response_data.content,
            'intent': response_data.intent,
            'confidence': response_data.confidence,
            'suggestions': response_data.suggestions,
            'actions': response_data.actions,
        })


class WebChatConfigView(APIView):
    """
    Public endpoint for chat widget configuration.

    GET /api/v1/chatbot/web-chat/config/?language=es
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """Return chatbot widget configuration."""
        language = request.query_params.get('language', 'es')
        ai_service = get_ai_service()
        config = ai_service.get_config(language=language)
        return Response(config)


class WebChatMessageView(APIView):
    """
    Public endpoint for web chat messages (used by frontend ChatWidget).

    POST /api/v1/chatbot/web-chat/message/
    Expected body: { message, session_id, language, history }
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        """Process a web chat message and return AI response."""
        message = request.data.get('message', '').strip()
        session_id = request.data.get('session_id', '')
        language = request.data.get('language', 'es')
        history = request.data.get('history', [])

        if not message:
            return Response(
                {'error': 'Message is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not session_id:
            return Response(
                {'error': 'session_id is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get or create conversation
        conversation, created = Conversation.objects.get_or_create(
            session_id=session_id,
            defaults={
                'channel': 'web',
                'status': Conversation.STATUS_ACTIVE,
                'metadata': {'language': language},
            },
        )

        # Store user message
        Message.objects.create(
            conversation=conversation,
            role='user',
            content=message,
        )

        # Get AI response
        ai_service = get_ai_service()
        response_data = ai_service.generate_response(
            message=message,
            history=history,
            language=language,
            session_id=session_id,
        )

        # Store bot message
        Message.objects.create(
            conversation=conversation,
            role='bot',
            content=response_data.content,
            intent=response_data.intent,
            confidence=response_data.confidence,
            metadata=response_data.metadata,
        )

        conversation.save(update_fields=['updated_at'])

        return Response({
            'message': response_data.content,
            'source': response_data.source,
            'intent': response_data.intent,
            'confidence': response_data.confidence,
            'suggestions': response_data.suggestions,
            'should_escalate': response_data.should_escalate,
            'whatsapp_links': response_data.whatsapp_links,
        })


class MessageViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for message viewing.

    GET /api/v1/chatbot/messages/?conversation_id={id}
    """

    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = StandardPagination

    def get_queryset(self):
        """Filter messages by conversation."""
        qs = super().get_queryset()
        conversation_id = self.request.query_params.get('conversation_id')
        if conversation_id:
            qs = qs.filter(conversation_id=conversation_id)
        return qs.order_by('created_at')
