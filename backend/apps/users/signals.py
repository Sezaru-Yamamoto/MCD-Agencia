"""
User Signals for MCD-Agencia.

This module contains signal handlers for user-related events:
    - Assign default role on user creation
    - Create audit log entries
    - Send notifications
"""

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import User, Role


@receiver(post_save, sender=User)
def assign_default_role(sender, instance, created, **kwargs):
    """
    Assign default customer role to new users.

    When a new user is created without a role, this signal assigns
    the 'customer' role by default.

    Args:
        sender: The User model class
        instance: The User instance being saved
        created: Whether this is a new user
        **kwargs: Additional arguments
    """
    if created and not instance.role and not instance.is_superuser:
        try:
            customer_role = Role.objects.get(name=Role.CUSTOMER)
            instance.role = customer_role
            instance.save(update_fields=['role'])
        except Role.DoesNotExist:
            pass  # Role will be created in migrations


@receiver(pre_save, sender=User)
def normalize_email(sender, instance, **kwargs):
    """
    Normalize email address before saving.

    Ensures email addresses are stored in lowercase for consistent lookups.

    Args:
        sender: The User model class
        instance: The User instance being saved
        **kwargs: Additional arguments
    """
    if instance.email:
        instance.email = instance.email.lower().strip()
