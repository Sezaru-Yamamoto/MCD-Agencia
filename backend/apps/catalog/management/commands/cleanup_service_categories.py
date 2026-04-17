"""
Clean catalog service categories so they match active services from Content.

Usage:
    python manage.py cleanup_service_categories
    python manage.py cleanup_service_categories --dry-run
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.catalog.models import CatalogItem, Category
from apps.content.models import Service


def _normalize(value: str) -> str:
    return (value or "").strip().lower()


class Command(BaseCommand):
    help = "Keep only canonical service categories from active Content services"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would change without writing to the database",
        )

    def handle(self, *args, **options):
        dry_run = options.get("dry_run", False)

        services = list(
            Service.objects.filter(is_active=True)
            .exclude(service_key__isnull=True)
            .exclude(service_key="")
            .order_by("position", "name")
        )

        if not services:
            self.stdout.write(self.style.WARNING("No active content services found. Nothing to clean."))
            return

        created = 0
        restored = 0
        updated = 0
        reassigned_items = 0
        removed_categories = 0

        keep_ids = set()
        keep_by_name = {}

        context = transaction.atomic() if not dry_run else None
        if context:
            context.__enter__()

        try:
            for service in services:
                key = (service.service_key or "").strip()
                if not key:
                    continue

                category, was_created = Category.all_objects.get_or_create(
                    slug=key,
                    defaults={
                        "name": service.name,
                        "name_en": service.name_en or service.name,
                        "description": service.description or "",
                        "description_en": service.description_en or "",
                        "type": "service",
                        "parent": None,
                        "is_active": True,
                    },
                )

                if was_created:
                    created += 1

                changed_fields = []

                if category.is_deleted:
                    category.is_deleted = False
                    category.deleted_at = None
                    changed_fields.extend(["is_deleted", "deleted_at"])
                    restored += 1

                if category.type != "service":
                    category.type = "service"
                    changed_fields.append("type")

                if category.parent_id is not None:
                    category.parent = None
                    changed_fields.append("parent")

                if not category.is_active:
                    category.is_active = True
                    changed_fields.append("is_active")

                if category.name != service.name:
                    category.name = service.name
                    changed_fields.append("name")

                if (service.name_en or service.name) and category.name_en != (service.name_en or service.name):
                    category.name_en = service.name_en or service.name
                    changed_fields.append("name_en")

                if category.description != (service.description or ""):
                    category.description = service.description or ""
                    changed_fields.append("description")

                if category.description_en != (service.description_en or ""):
                    category.description_en = service.description_en or ""
                    changed_fields.append("description_en")

                if changed_fields:
                    updated += 1
                    if not dry_run:
                        category.save(update_fields=list(dict.fromkeys(changed_fields + ["updated_at"])))

                keep_ids.add(category.id)
                keep_by_name[_normalize(category.name)] = category

            stale_categories = list(
                Category.objects.filter(type="service")
                .exclude(id__in=keep_ids)
                .order_by("tree_id", "lft")
            )

            for stale in stale_categories:
                target = None

                ancestors = stale.get_ancestors(include_self=False)
                for ancestor in reversed(list(ancestors)):
                    if ancestor.id in keep_ids:
                        target = ancestor
                        break

                if target is None:
                    target = keep_by_name.get(_normalize(stale.name))

                moved = CatalogItem.objects.filter(type="service", category=stale).update(category=target)
                reassigned_items += moved

                removed_categories += 1
                if not dry_run:
                    if stale.is_active:
                        stale.is_active = False
                        stale.save(update_fields=["is_active", "updated_at"])
                    stale.delete()

            if context:
                context.__exit__(None, None, None)

        except Exception as exc:
            if context:
                context.__exit__(type(exc), exc, exc.__traceback__)
            raise

        mode = "DRY RUN" if dry_run else "APPLIED"
        self.stdout.write(
            self.style.SUCCESS(
                "Service category cleanup ({mode}): created={created}, restored={restored}, "
                "updated={updated}, reassigned_items={reassigned}, removed={removed}".format(
                    mode=mode,
                    created=created,
                    restored=restored,
                    updated=updated,
                    reassigned=reassigned_items,
                    removed=removed_categories,
                )
            )
        )