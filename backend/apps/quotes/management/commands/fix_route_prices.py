"""
Management command to fix corrupted service_details.rutas[].precio_unitario.

When a client submitted a change request via QuoteChangeEditor, the old
serviceDetailsFromRequest() hardcoded unit_price: 0 for all routes.  This
meant the proposed_lines.service_details.rutas[].precio_unitario was 0.
When approve() applied these service_details, it overwrote the seller's
original prices with 0.

Additionally, the partial_update view was not saving service_details
when recreating lines, which could lose service_details entirely.

This command:
1. Finds route-based QuoteLines with precio_unitario=0
2. Tries to recover the correct price from expanded QuoteLines
3. Falls back to AuditLog before_state to find original prices
4. Also recalculates Quote totals from the expanded lines

Usage:
    python manage.py fix_route_prices          # dry-run
    python manage.py fix_route_prices --apply  # actually write
"""

from decimal import Decimal

from django.core.management.base import BaseCommand

from apps.audit.models import AuditLog
from apps.quotes.models import Quote, QuoteLine


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

    def _try_recover_from_audit(self, quote):
        """Try to recover original route prices from AuditLog before_state."""
        audit_entries = AuditLog.objects.filter(
            entity_type='Quote',
            entity_id=str(quote.id),
            action__in=[AuditLog.ACTION_UPDATED, AuditLog.ACTION_CREATED],
        ).order_by('-timestamp')

        for entry in audit_entries[:10]:
            before = entry.before_state
            if not before or not isinstance(before, dict):
                continue
            lines = before.get('lines')
            if not lines or not isinstance(lines, list):
                continue
            # Look for lines with service_details that have route prices > 0
            for line_data in lines:
                sd = line_data.get('service_details')
                if not sd or not isinstance(sd, dict):
                    continue
                rutas = sd.get('rutas')
                if not rutas or not isinstance(rutas, list):
                    continue
                has_prices = any(
                    isinstance(r, dict) and (r.get('precio_unitario') or 0) > 0
                    for r in rutas
                )
                if has_prices:
                    return rutas
        return None

    def handle(self, *args, **options):
        apply = options['apply']
        mode = 'APPLY' if apply else 'DRY-RUN'
        self.stdout.write(f'\n=== Fix route prices in service_details ({mode}) ===\n')

        # Find all QuoteLines that have route-based service_details
        route_lines = QuoteLine.objects.filter(
            service_details__isnull=False,
        ).select_related('quote').order_by('quote_id', 'position')

        total_fixed = 0
        quotes_to_recalculate = set()

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

            # Strategy 1: Find expanded lines with correct prices
            expanded = list(
                QuoteLine.objects.filter(
                    quote=line.quote,
                    position__gt=line.position,
                    service_details__isnull=True,
                ).order_by('position')[:len(rutas)]
            )

            patched_count = 0

            if expanded:
                for idx, ruta in enumerate(rutas):
                    if not isinstance(ruta, dict) or idx >= len(expanded):
                        break
                    current_price = ruta.get('precio_unitario') or 0
                    expanded_price = float(expanded[idx].unit_price)

                    if current_price == 0 and expanded_price > 0:
                        ruta['precio_unitario'] = expanded_price
                        patched_count += 1
                        self.stdout.write(
                            f'    Ruta {idx+1}: precio_unitario 0 → {expanded_price} (from expanded line)'
                        )

                    # Also fix cantidad if needed
                    current_qty = ruta.get('cantidad') or 0
                    expanded_qty = float(expanded[idx].quantity)
                    if current_qty == 0 and expanded_qty > 0:
                        ruta['cantidad'] = expanded_qty

            # Strategy 2: If expanded lines also have 0, try AuditLog
            still_has_zero = any(
                isinstance(r, dict) and (r.get('precio_unitario') or 0) == 0
                for r in rutas
            )
            if still_has_zero:
                audit_rutas = self._try_recover_from_audit(line.quote)
                if audit_rutas:
                    for idx, ruta in enumerate(rutas):
                        if not isinstance(ruta, dict):
                            continue
                        current_price = ruta.get('precio_unitario') or 0
                        if current_price == 0 and idx < len(audit_rutas):
                            audit_r = audit_rutas[idx]
                            if isinstance(audit_r, dict):
                                audit_price = audit_r.get('precio_unitario') or 0
                                if audit_price > 0:
                                    ruta['precio_unitario'] = audit_price
                                    patched_count += 1
                                    self.stdout.write(
                                        f'    Ruta {idx+1}: precio_unitario 0 → {audit_price} (from audit log)'
                                    )

            if patched_count > 0:
                self.stdout.write(
                    f'  Line {line.id} (Quote #{line.quote.quote_number}, '
                    f'{subtipo}): patched {patched_count}/{len(rutas)} route price(s)'
                )
                quotes_to_recalculate.add(line.quote_id)

                if apply:
                    line.service_details = sd
                    line.save(update_fields=['service_details', 'updated_at'])

                    # Also update expanded lines' unit_price from the patched rutas
                    if expanded:
                        for idx, ruta in enumerate(rutas):
                            if not isinstance(ruta, dict) or idx >= len(expanded):
                                break
                            price = ruta.get('precio_unitario') or 0
                            qty = ruta.get('cantidad') or 1
                            if price > 0:
                                exp_line = expanded[idx]
                                exp_line.unit_price = Decimal(str(price))
                                exp_line.quantity = Decimal(str(qty))
                                exp_line.line_total = exp_line.unit_price * exp_line.quantity
                                exp_line.save(update_fields=[
                                    'unit_price', 'quantity', 'line_total', 'updated_at'
                                ])

                total_fixed += patched_count
            else:
                # Still has zero prices and couldn't recover
                still_zero = sum(
                    1 for r in rutas
                    if isinstance(r, dict) and (r.get('precio_unitario') or 0) == 0
                )
                if still_zero > 0:
                    self.stdout.write(
                        self.style.WARNING(
                            f'  Line {line.id} (Quote #{line.quote.quote_number}, '
                            f'{subtipo}): {still_zero} route(s) still have price=0, '
                            f'could not recover from expanded lines or audit log.'
                        )
                    )

        # Recalculate totals for affected quotes
        if apply and quotes_to_recalculate:
            self.stdout.write(f'\n  Recalculating totals for {len(quotes_to_recalculate)} quote(s)...')
            for qid in quotes_to_recalculate:
                try:
                    quote = Quote.objects.get(id=qid)
                    quote.calculate_totals()
                    quote.save(update_fields=['subtotal', 'tax_amount', 'total', 'updated_at'])
                    self.stdout.write(
                        f'    Quote #{quote.quote_number}: total = {quote.total}'
                    )
                except Quote.DoesNotExist:
                    pass

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
