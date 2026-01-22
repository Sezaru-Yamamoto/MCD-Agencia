"""
Inventory Signals for MCD-Agencia.

Signal handlers for inventory-related events.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.catalog.models import ProductVariant

from .models import StockAlert


@receiver(post_save, sender=ProductVariant)
def check_low_stock(sender, instance, **kwargs):
    """
    Check for low stock and create alert if needed.

    Creates a StockAlert when stock falls below threshold.
    Resolves existing alerts when stock is replenished.
    """
    # Check if stock is below threshold
    if instance.stock <= instance.low_stock_threshold:
        # Check if there's already a pending/acknowledged alert
        existing_alert = StockAlert.objects.filter(
            variant=instance,
            status__in=[StockAlert.STATUS_PENDING, StockAlert.STATUS_ACKNOWLEDGED]
        ).first()

        if not existing_alert:
            # Create new alert
            StockAlert.objects.create(
                variant=instance,
                threshold=instance.low_stock_threshold,
                current_stock=instance.stock
            )
    else:
        # Stock is above threshold, resolve any pending alerts
        StockAlert.objects.filter(
            variant=instance,
            status__in=[StockAlert.STATUS_PENDING, StockAlert.STATUS_ACKNOWLEDGED]
        ).update(status=StockAlert.STATUS_RESOLVED)
