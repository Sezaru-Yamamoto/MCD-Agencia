"""
Temporary management command to resend quote emails.

Usage:
    python manage.py resend_quotes          # List quotes with status 'sent'
    python manage.py resend_quotes --send   # Actually resend the emails

Safe to remove after use.
"""

import time

from django.core.management.base import BaseCommand

from apps.quotes.models import Quote
from apps.quotes.tasks import send_quote_email_sync


class Command(BaseCommand):
    help = 'Resend emails for quotes that were marked as sent but may not have been delivered.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--send',
            action='store_true',
            help='Actually send the emails. Without this flag, only lists the quotes.',
        )
        parser.add_argument(
            '--quote-number',
            type=str,
            help='Resend a specific quote by its number (e.g., COT-20260205-7066).',
        )

    def handle(self, *args, **options):
        do_send = options['send']
        specific = options.get('quote_number')

        # Find quotes
        qs = Quote.objects.filter(status='sent').select_related('quote_request', 'created_by')
        if specific:
            qs = qs.filter(quote_number=specific)

        quotes = list(qs.order_by('-sent_at'))

        if not quotes:
            self.stdout.write(self.style.WARNING('No quotes with status "sent" found.'))
            return

        self.stdout.write(self.style.SUCCESS(f'\nFound {len(quotes)} quote(s) with status "sent":\n'))

        for q in quotes:
            self.stdout.write(
                f'  • {q.quote_number}  →  {q.customer_email}  '
                f'(sent_at: {q.sent_at}, total: ${q.total})'
            )

        if not do_send:
            self.stdout.write(self.style.WARNING(
                '\n⚠  Dry run. Add --send to actually resend the emails.\n'
                '   Example: python manage.py resend_quotes --send\n'
            ))
            return

        # Actually send
        self.stdout.write(self.style.HTTP_INFO('\nResending emails...\n'))
        success = 0
        failed = 0

        for q in quotes:
            try:
                self.stdout.write(f'  Sending {q.quote_number} to {q.customer_email}... ', ending='')
                send_quote_email_sync(str(q.id))
                self.stdout.write(self.style.SUCCESS('✓ OK'))
                success += 1
                time.sleep(2)  # Small delay between emails to avoid rate limiting
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'✗ FAILED: {e}'))
                failed += 1

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'Done! Sent: {success}, Failed: {failed}'))
