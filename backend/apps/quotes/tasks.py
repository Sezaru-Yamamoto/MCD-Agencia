"""
Celery Tasks for Quotes App.

This module contains asynchronous tasks for quote management:
    - PDF quote generation
    - Quote notification emails
    - Quote expiration handling
    - Reminder emails for pending quotes
"""

import logging
from datetime import timedelta
from io import BytesIO

from celery import shared_task
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.mail import EmailMessage, send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=120,
    autoretry_for=(Exception,),
)
def generate_quote_pdf(self, quote_id: str) -> str:
    """
    Generate PDF document for a quote.

    Uses WeasyPrint or ReportLab to generate professional PDF quotes.

    Args:
        quote_id: UUID of the quote.

    Returns:
        str: Path to the generated PDF file.
    """
    from apps.quotes.models import Quote

    try:
        # Import PDF library (WeasyPrint recommended)
        try:
            from weasyprint import HTML, CSS
            use_weasyprint = True
        except ImportError:
            # Fallback to ReportLab
            from reportlab.lib.pagesizes import letter
            from reportlab.pdfgen import canvas
            from reportlab.lib.units import inch
            use_weasyprint = False

        quote = Quote.objects.select_related(
            'request', 'request__user', 'created_by'
        ).prefetch_related('lines').get(id=quote_id)

        if use_weasyprint:
            # Render HTML template
            context = {
                'quote': quote,
                'customer': quote.request.user,
                'lines': quote.lines.all(),
                'company_name': 'MCD Agencia',
                'company_address': 'Acapulco, Guerrero, México',
                'company_phone': '+52 744 XXX XXXX',
                'company_email': settings.DEFAULT_FROM_EMAIL,
                'generated_at': timezone.now(),
            }

            html_string = render_to_string('pdf/quote_template.html', context)

            # Generate PDF
            html = HTML(string=html_string, base_url=settings.STATIC_ROOT)
            pdf_content = html.write_pdf()

        else:
            # ReportLab fallback
            buffer = BytesIO()
            p = canvas.Canvas(buffer, pagesize=letter)
            width, height = letter

            # Header
            p.setFont("Helvetica-Bold", 24)
            p.drawString(1 * inch, height - 1 * inch, "MCD Agencia")

            p.setFont("Helvetica", 12)
            p.drawString(1 * inch, height - 1.3 * inch, f"Cotización #{quote.quote_number}")

            # Customer info
            p.setFont("Helvetica-Bold", 12)
            p.drawString(1 * inch, height - 2 * inch, "Cliente:")
            p.setFont("Helvetica", 11)
            if quote.request.user:
                p.drawString(1 * inch, height - 2.3 * inch, quote.request.user.get_full_name())
                p.drawString(1 * inch, height - 2.5 * inch, quote.request.user.email)
            else:
                p.drawString(1 * inch, height - 2.3 * inch, quote.request.contact_name)
                p.drawString(1 * inch, height - 2.5 * inch, quote.request.contact_email)

            # Quote lines
            y_position = height - 3.5 * inch
            p.setFont("Helvetica-Bold", 11)
            p.drawString(1 * inch, y_position, "Descripción")
            p.drawString(4.5 * inch, y_position, "Cantidad")
            p.drawString(5.5 * inch, y_position, "Precio Unit.")
            p.drawString(6.5 * inch, y_position, "Total")

            y_position -= 0.3 * inch
            p.setFont("Helvetica", 10)

            for line in quote.lines.all():
                p.drawString(1 * inch, y_position, line.description[:40])
                p.drawString(4.5 * inch, y_position, str(line.quantity))
                p.drawString(5.5 * inch, y_position, f"${line.unit_price}")
                p.drawString(6.5 * inch, y_position, f"${line.line_total}")
                y_position -= 0.25 * inch

            # Totals
            y_position -= 0.3 * inch
            p.setFont("Helvetica-Bold", 11)
            p.drawString(5.5 * inch, y_position, "Subtotal:")
            p.drawString(6.5 * inch, y_position, f"${quote.subtotal}")

            y_position -= 0.25 * inch
            p.drawString(5.5 * inch, y_position, f"IVA ({quote.tax_rate}%):")
            p.drawString(6.5 * inch, y_position, f"${quote.tax_amount}")

            y_position -= 0.25 * inch
            p.setFont("Helvetica-Bold", 12)
            p.drawString(5.5 * inch, y_position, "Total:")
            p.drawString(6.5 * inch, y_position, f"${quote.total}")

            # Footer
            p.setFont("Helvetica", 9)
            p.drawString(1 * inch, 0.75 * inch, f"Válido hasta: {quote.valid_until.strftime('%d/%m/%Y')}")
            p.drawString(1 * inch, 0.5 * inch, "Precios en MXN. IVA incluido.")

            p.showPage()
            p.save()

            buffer.seek(0)
            pdf_content = buffer.getvalue()

        # Save PDF to quote
        filename = f"cotizacion_{quote.quote_number}.pdf"
        quote.pdf_file.save(filename, ContentFile(pdf_content))
        quote.save(update_fields=['pdf_file'])

        logger.info(f"PDF generated for quote {quote.quote_number}")
        return quote.pdf_file.url

    except Quote.DoesNotExist:
        logger.error(f"Quote {quote_id} not found")
        return None


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
)
def send_quote_email(self, quote_id: str):
    """
    Send quote to customer via email with PDF attachment.

    Args:
        quote_id: UUID of the quote.

    Returns:
        bool: True if email was sent successfully.
    """
    from apps.quotes.models import Quote

    try:
        quote = Quote.objects.select_related(
            'request', 'request__user'
        ).get(id=quote_id)

        # Determine recipient
        if quote.request.user:
            recipient_email = quote.request.user.email
            recipient_name = quote.request.user.get_full_name()
        else:
            recipient_email = quote.request.contact_email
            recipient_name = quote.request.contact_name

        context = {
            'quote': quote,
            'recipient_name': recipient_name,
            'quote_url': f"{settings.FRONTEND_URL}/quotes/{quote.id}",
            'company_name': 'MCD Agencia',
        }

        html_message = render_to_string('emails/quote_ready.html', context)
        plain_message = strip_tags(html_message)

        # Create email with attachment
        email = EmailMessage(
            subject=f'Tu cotización #{quote.quote_number} está lista - MCD Agencia',
            body=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient_email],
        )
        email.content_subtype = 'html'
        email.body = html_message

        # Attach PDF if available
        if quote.pdf_file:
            email.attach_file(quote.pdf_file.path)

        email.send(fail_silently=False)

        logger.info(f"Quote email sent for {quote.quote_number} to {recipient_email}")
        return True

    except Quote.DoesNotExist:
        logger.error(f"Quote {quote_id} not found")
        return False


@shared_task
def expire_old_quotes():
    """
    Mark quotes as expired if past their valid_until date.

    This task runs hourly (configured in celery.py).

    Returns:
        int: Number of quotes expired.
    """
    from apps.quotes.models import Quote

    now = timezone.now()

    # Find quotes that should be expired
    expired_quotes = Quote.objects.filter(
        valid_until__lt=now,
        status__in=['draft', 'sent'],
    )

    count = 0
    for quote in expired_quotes:
        quote.status = 'expired'
        quote.save(update_fields=['status'])

        # Notify customer about expiration
        send_quote_expiration_notification.delay(str(quote.id))
        count += 1

    logger.info(f"Expired {count} quotes")
    return count


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
)
def send_quote_expiration_notification(self, quote_id: str):
    """
    Send notification when a quote has expired.

    Args:
        quote_id: UUID of the quote.

    Returns:
        bool: True if notification was sent successfully.
    """
    from apps.quotes.models import Quote

    try:
        quote = Quote.objects.select_related('request', 'request__user').get(id=quote_id)

        # Determine recipient
        if quote.request.user:
            recipient_email = quote.request.user.email
            recipient_name = quote.request.user.get_full_name()
        else:
            recipient_email = quote.request.contact_email
            recipient_name = quote.request.contact_name

        context = {
            'quote': quote,
            'recipient_name': recipient_name,
            'contact_url': f"{settings.FRONTEND_URL}/contact",
            'company_name': 'MCD Agencia',
        }

        html_message = render_to_string('emails/quote_expired.html', context)
        plain_message = strip_tags(html_message)

        send_mail(
            subject=f'Tu cotización #{quote.quote_number} ha expirado - MCD Agencia',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            html_message=html_message,
            fail_silently=False,
        )

        logger.info(f"Quote expiration notification sent for {quote.quote_number}")
        return True

    except Quote.DoesNotExist:
        logger.error(f"Quote {quote_id} not found")
        return False


@shared_task
def send_quote_reminders():
    """
    Send reminder emails for quotes expiring soon.

    This task runs daily at 10:00 AM (configured in celery.py).
    Sends reminders for quotes expiring within 3 days.

    Returns:
        int: Number of reminders sent.
    """
    from apps.quotes.models import Quote

    now = timezone.now()
    reminder_threshold = now + timedelta(days=3)

    # Find quotes expiring soon that haven't been reminded
    expiring_quotes = Quote.objects.filter(
        valid_until__gt=now,
        valid_until__lte=reminder_threshold,
        status='sent',
    ).select_related('request', 'request__user')

    reminders_sent = 0

    for quote in expiring_quotes:
        # Determine recipient
        if quote.request.user:
            recipient_email = quote.request.user.email
            recipient_name = quote.request.user.get_full_name()
        else:
            recipient_email = quote.request.contact_email
            recipient_name = quote.request.contact_name

        days_remaining = (quote.valid_until - now).days

        context = {
            'quote': quote,
            'recipient_name': recipient_name,
            'days_remaining': days_remaining,
            'quote_url': f"{settings.FRONTEND_URL}/quotes/{quote.id}",
            'company_name': 'MCD Agencia',
        }

        html_message = render_to_string('emails/quote_reminder.html', context)
        plain_message = strip_tags(html_message)

        try:
            send_mail(
                subject=f'Tu cotización #{quote.quote_number} expira pronto - MCD Agencia',
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient_email],
                html_message=html_message,
                fail_silently=False,
            )
            reminders_sent += 1
            logger.info(f"Quote reminder sent for {quote.quote_number}")
        except Exception as e:
            logger.error(f"Failed to send quote reminder for {quote.quote_number}: {e}")

    logger.info(f"Sent {reminders_sent} quote reminders")
    return reminders_sent


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
)
def notify_admin_new_quote_request(self, request_id: str):
    """
    Notify sales team about new quote requests.

    Args:
        request_id: UUID of the quote request.

    Returns:
        bool: True if notification was sent successfully.
    """
    from apps.quotes.models import QuoteRequest
    from apps.users.models import User

    try:
        quote_request = QuoteRequest.objects.select_related('user').get(id=request_id)

        # Get sales team emails
        sales_emails = list(
            User.objects.filter(
                role__name__in=['superadmin', 'admin', 'sales'],
                is_active=True,
            ).values_list('email', flat=True)
        )

        if not sales_emails:
            logger.warning("No sales team members found to notify")
            return False

        context = {
            'request': quote_request,
            'request_url': f"{settings.FRONTEND_URL}/admin/quotes/requests/{quote_request.id}",
            'company_name': 'MCD Agencia',
        }

        html_message = render_to_string('emails/admin_new_quote_request.html', context)
        plain_message = strip_tags(html_message)

        send_mail(
            subject=f'Nueva solicitud de cotización #{quote_request.request_number}',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=sales_emails,
            html_message=html_message,
            fail_silently=False,
        )

        logger.info(f"New quote request notification sent for {quote_request.request_number}")
        return True

    except QuoteRequest.DoesNotExist:
        logger.error(f"Quote request {request_id} not found")
        return False


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
)
def send_quote_accepted_notification(self, quote_id: str):
    """
    Notify sales team when a quote is accepted by customer.

    Args:
        quote_id: UUID of the quote.

    Returns:
        bool: True if notification was sent successfully.
    """
    from apps.quotes.models import Quote
    from apps.users.models import User

    try:
        quote = Quote.objects.select_related(
            'request', 'request__user', 'created_by'
        ).get(id=quote_id)

        # Notify the quote creator and sales team
        recipient_emails = set()

        if quote.created_by and quote.created_by.email:
            recipient_emails.add(quote.created_by.email)

        # Add sales managers
        sales_emails = User.objects.filter(
            role__name__in=['superadmin', 'admin'],
            is_active=True,
        ).values_list('email', flat=True)

        recipient_emails.update(sales_emails)

        if not recipient_emails:
            logger.warning("No recipients found for quote acceptance notification")
            return False

        # Customer info
        if quote.request.user:
            customer_name = quote.request.user.get_full_name()
            customer_email = quote.request.user.email
        else:
            customer_name = quote.request.contact_name
            customer_email = quote.request.contact_email

        context = {
            'quote': quote,
            'customer_name': customer_name,
            'customer_email': customer_email,
            'quote_url': f"{settings.FRONTEND_URL}/admin/quotes/{quote.id}",
            'company_name': 'MCD Agencia',
        }

        html_message = render_to_string('emails/admin_quote_accepted.html', context)
        plain_message = strip_tags(html_message)

        send_mail(
            subject=f'¡Cotización #{quote.quote_number} aceptada! - ${quote.total}',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=list(recipient_emails),
            html_message=html_message,
            fail_silently=False,
        )

        logger.info(f"Quote acceptance notification sent for {quote.quote_number}")
        return True

    except Quote.DoesNotExist:
        logger.error(f"Quote {quote_id} not found")
        return False
