"""
Catalog Signals for MCD-Agencia.

Signal handlers for catalog-related events.
"""

from django.db.models.signals import post_save, m2m_changed
from django.dispatch import receiver

from .models import ProductVariant


@receiver(m2m_changed, sender=ProductVariant.attribute_values.through)
def update_variant_name(sender, instance, action, **kwargs):
    """
    Auto-generate variant name when attribute values change.

    Args:
        sender: The through model
        instance: The ProductVariant instance
        action: The m2m action (post_add, post_remove, etc.)
        **kwargs: Additional arguments
    """
    if action in ['post_add', 'post_remove', 'post_clear']:
        name = instance.generate_name_from_attributes()
        if name and name != instance.name:
            instance.name = name
            instance.save(update_fields=['name', 'updated_at'])
