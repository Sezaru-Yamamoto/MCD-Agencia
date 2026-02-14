"""
Management command to fix corrupted service_details.rutas[].precio_unitario.

When a client submitted a change request via QuoteChangeEditor, the old
serviceDetailsFromRequest() hardcoded unit_price: 0 for all routes.  This
meant the proposed_lines.service_details.rutas[].precio_unitario was 0.
When approve() applied these service_details, it overwrote the seller's
original prices with 0.

The expanded QuoteLines (one per route, without service_details) still
have the correct unit_price in their DB column.  This command reads those
prices and patches the parent line's service_details.rutas[].precio_unitario.

Usage:
    python manage.py fix_route_prices          # dry-run
    python manage.py fix_route_prices --apply  # actually write
"""

from django.core.management.base import BaseCommand

from apps.quotes.models import QuoteLine


ROUTE_SUBTYPES = {'vallas-moviles', 'publibuses', 'perifoneo'}


class Command(BaseCommand):
    help = (
        'Fix service_details.rutas[].precio_unitario for route-based '
        'QuoteLines whose prices were corrupted to 0 by client change requests.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--apply',
            action='store_true',
            default=False,
            help='Actually write changes to the database (default is dry-run).',
        )

    def handle(self, *args, **options):
        apply = options['apply']
        mode = 'APPLY' if apply else 'DRY-RUN'
        self.stdout.write(f'\n=== Fix route prices in service_details ({mode}) ===\n')

        # Find all QuoteLines that have route-based service_details
        route_lines = QuoteLine.objects.filter(
            service_details__isnull=False,
        ).select_related('quote').order_by('quote_id', 'position')

        total_fixed = 0

        for line in route_lines:
            sd = line.service_details
            if not isinstance(sd, dict):
                continue

            subtipo = sd.get('subtipo')
            if subtipo not in ROUTE_SUBTYPES:
                continue

            rutas = sd.get('rutas')
            if not rutas or not isinstance(rutas, list) or len(rutas) == 0:
                continue

            # Check if any route has precio_unitario == 0 (corrupted)
            has_zero_price = any(
                isinstance(r, dict) and (r.get('precio_unitario') or 0) == 0
                for r in rutas
            )
            if not has_zero_price:
                continue  # all prices look fine

            # Find expanded lines: subsequent lines in the same quote
            # without service_details, ordered by position
            expanded = list(
                QuoteLine.objects.filter(
                    quote=line.quote,
                    position__gt=line.position,
                    service_details__isnull=True,
                ).order_by('position')[:len(rutas)]
            )

            if not expanded:
                self.stdout.write(
                    self.style.WARNING(
                        f'  Line {line.id} (Quote #{line.quote.quote_number}): '
                        f'has {len(rutas)} route(s) with price=0 but no expanded lines found.'
                    )
                )
                continue

            # Patch each ruta's precio_unitario from expanded line's unit_price
            patched_count = 0
            for idx, ruta in enumerate(rutas):
                if not isinstance(ruta, dict):
                    continue
                if idx >= len(expanded):
                    break

                current_price = ruta.get('precio_unitario') or 0
                expanded_price = float(expanded[idx].unit_price)

                if current_price == 0 and expanded_price > 0:
                    ruta['precio_unitario'] = expanded_price
                    patched_count += 1

                    # Also fix cantidad if needed
                    current_qty = ruta.get('cantidad') or 0
                    expanded_qty = float(expanded[idx].quantity)
                    if current_qty == 0 and expanded_qty > 0:
                        ruta['cantidad'] = expanded_qty

            if patched_count > 0:
                label = (
                    f'  Line {line.id} (Quote #{line.quote.quote_number}, '
                    f'{subtipo}): patching {patched_count}/{len(rutas)} route price(s)'
                )
                for idx, ruta in enumerate(rutas):
                    if idx < len(expanded):
                        self.stdout.write(
                            f'    Ruta {idx+1}: precio_unitario = {ruta.get("precio_unitario")}'
                        )

                self.stdout.write(label)

                if apply:
                    line.service_details = sd
                    line.save(update_fields=['service_details', 'updated_at'])

                total_fixed += patched_count

        self.stdout.write(
            self.style.SUCCESS(
                f'\nDone. {total_fixed} route price(s) '
                f'{"fixed" if apply else "found (dry-run)"}.\n'
            )
        )
        if not apply and total_fixed:
            self.stdout.write(
                'Run with --apply to write changes to the database.\n'
            )
