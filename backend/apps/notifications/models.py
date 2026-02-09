"""
Notification Models for MCD-Agencia.
"""

import uuid
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Notification(models.Model):
    """In-app notification for users."""

    TYPE_QUOTE_REQUEST = 'quote_request'
    TYPE_QUOTE_SENT = 'quote_sent'
    TYPE_QUOTE_ACCEPTED = 'quote_accepted'
    TYPE_QUOTE_REJECTED = 'quote_rejected'
    TYPE_CHANGE_REQUEST = 'change_request'
    TYPE_ORDER_CREATED = 'order_created'
    TYPE_GENERAL = 'general'

    TYPE_CHOICES = [
        (TYPE_QUOTE_REQUEST, _('New Quote Request')),
        (TYPE_QUOTE_SENT, _('Quote Sent')),
        (TYPE_QUOTE_ACCEPTED, _('Quote Accepted')),
        (TYPE_QUOTE_REJECTED, _('Quote Rejected')),
        (TYPE_CHANGE_REQUEST, _('Change Request')),
        (TYPE_ORDER_CREATED, _('Order Created')),
        (TYPE_GENERAL, _('General')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    notification_type = models.CharField(
        _('type'), max_length=30, choices=TYPE_CHOICES, default=TYPE_GENERAL
    )
    title = models.CharField(_('title'), max_length=255)
    message = models.TextField(_('message'), blank=True)
    is_read = models.BooleanField(_('is read'), default=False)

    # Optional link to entity
    entity_type = models.CharField(_('entity type'), max_length=50, blank=True)
    entity_id = models.CharField(_('entity id'), max_length=50, blank=True)
    action_url = models.CharField(_('action url'), max_length=500, blank=True)

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)

    class Meta:
        verbose_name = _('notification')
        verbose_name_plural = _('notifications')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['recipient', '-created_at']),
        ]

    def __str__(self):
        return f"{self.title} → {self.recipient}"

    @classmethod
    def notify(cls, recipient, notification_type, title, message='',
               entity_type='', entity_id='', action_url=''):
        """Create a notification for a user."""
        return cls.objects.create(
            recipient=recipient,
            notification_type=notification_type,
            title=title,
            message=message,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id else '',
            action_url=action_url,
        )

    @classmethod
    def notify_staff(cls, notification_type, title, message='',
                     entity_type='', entity_id='', action_url=''):
        """Create a notification for all staff users."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        staff_users = User.objects.filter(is_staff=True, is_active=True)
        notifications = []
        for user in staff_users:
            notifications.append(cls(
                recipient=user,
                notification_type=notification_type,
                title=title,
                message=message,
                entity_type=entity_type,
                entity_id=str(entity_id) if entity_id else '',
                action_url=action_url,
            ))
        return cls.objects.bulk_create(notifications)
