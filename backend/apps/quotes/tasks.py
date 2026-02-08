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
    max_retries=2,
    default_retry_delay=5,
)
def generate_quote_pdf(quote_id: str) -> str:
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
        # Import PDF library (WeasyPrint recommended, but requires GTK on Windows)
        use_weasyprint = False
        try:
            from weasyprint import HTML, CSS
            # Test if WeasyPrint actually works (may fail on Windows without GTK)
            use_weasyprint = True
        except (ImportError, OSError) as e:
            logger.warning(f"WeasyPrint not available ({e}), using ReportLab fallback")
            use_weasyprint = False

        if not use_weasyprint:
            # Fallback to ReportLab - import required modules
            from reportlab.lib.pagesizes import letter
            from reportlab.lib.units import inch
            from reportlab.lib.colors import HexColor
            from reportlab.lib import colors
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, KeepTogether
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
            from reportlab.pdfgen import canvas
            import os

        quote = Quote.objects.select_related(
            'quote_request', 'created_by'
        ).prefetch_related('lines').get(id=quote_id)

        if use_weasyprint:
            # Render HTML template
            context = {
                'quote': quote,
                'customer_name': quote.customer_name,
                'customer_email': quote.customer_email,
                'customer_company': quote.customer_company,
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
            # Professional ReportLab PDF with brand colors
            buffer = BytesIO()

            # Brand colors
            CYAN = HexColor('#0DA3EF')
            MAGENTA = HexColor('#EC2D8D')
            BLACK = HexColor('#141414')
            GRAY = HexColor('#666666')
            LIGHT_GRAY = HexColor('#F5F5F5')
            WHITE = colors.white

            # Page dimensions
            page_width, page_height = letter
            margin_left = 0.75 * inch
            margin_right = 0.75 * inch
            margin_top = 0.5 * inch
            margin_bottom = 1.2 * inch  # Extra space for fixed footer

            # Create document with extra bottom margin for footer
            doc = SimpleDocTemplate(
                buffer,
                pagesize=letter,
                rightMargin=margin_right,
                leftMargin=margin_left,
                topMargin=margin_top,
                bottomMargin=margin_bottom
            )

            # Styles
            styles = getSampleStyleSheet()
            styles.add(ParagraphStyle(
                name='CompanyName',
                fontSize=24,
                fontName='Helvetica-Bold',
                textColor=BLACK,
                spaceAfter=6
            ))
            styles.add(ParagraphStyle(
                name='QuoteTitle',
                fontSize=14,
                fontName='Helvetica-Bold',
                textColor=CYAN,
                spaceAfter=20
            ))
            styles.add(ParagraphStyle(
                name='SectionTitle',
                fontSize=11,
                fontName='Helvetica-Bold',
                textColor=BLACK,
                spaceBefore=15,
                spaceAfter=8
            ))
            styles.add(ParagraphStyle(
                name='CustomerInfo',
                fontSize=10,
                fontName='Helvetica',
                textColor=GRAY,
                leading=14
            ))
            styles.add(ParagraphStyle(
                name='Footer',
                fontSize=8,
                fontName='Helvetica',
                textColor=GRAY,
                alignment=TA_CENTER
            ))

            elements = []
            width, height = letter
            content_width = width - 1.5 * inch

            # =====================================================================
            # HEADER SECTION - Company Info and Quote Number
            # =====================================================================

            # Try to load logo from various locations
            possible_logo_paths = [
                os.path.join(settings.STATIC_ROOT or '', 'images', 'logo.png'),
                os.path.join(settings.BASE_DIR, '..', 'frontend', 'public', 'logo.png'),
                os.path.join(settings.BASE_DIR, '..', 'frontend', 'public', 'images', 'logo.png'),
                os.path.join(settings.BASE_DIR, 'static', 'images', 'logo.png'),
            ]
            logo_path = None
            for path in possible_logo_paths:
                if os.path.exists(path):
                    logo_path = path
                    break
            has_logo = logo_path is not None

            if has_logo:
                try:
                    logo = Image(logo_path, width=60, height=60)
                    header_data = [
                        [logo, '', Paragraph('COTIZACIÓN', styles['QuoteTitle'])],
                        ['', '', Paragraph(f'<b>#{quote.quote_number}</b>', ParagraphStyle(
                            'QuoteNum', fontSize=12, fontName='Helvetica-Bold', textColor=BLACK, alignment=TA_RIGHT
                        ))],
                    ]
                except Exception:
                    has_logo = False

            if not has_logo:
                header_data = [
                    [Paragraph('<b>MCD AGENCIA</b>', styles['CompanyName']), '', Paragraph('COTIZACIÓN', styles['QuoteTitle'])],
                    [Paragraph('Acapulco, Guerrero', styles['CustomerInfo']), '', Paragraph(f'<b>#{quote.quote_number}</b>', ParagraphStyle(
                        'QuoteNum', fontSize=12, fontName='Helvetica-Bold', textColor=BLACK, alignment=TA_RIGHT
                    ))],
                ]

            header_table = Table(header_data, colWidths=[2 * inch, content_width - 4 * inch, 2 * inch])
            header_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
            ]))
            elements.append(header_table)

            # Cyan divider line
            elements.append(Spacer(1, 10))
            divider_data = [['']]
            divider = Table(divider_data, colWidths=[content_width])
            divider.setStyle(TableStyle([
                ('LINEABOVE', (0, 0), (-1, 0), 3, CYAN),
            ]))
            elements.append(divider)
            elements.append(Spacer(1, 15))

            # =====================================================================
            # CUSTOMER INFO AND QUOTE DATE SECTION
            # =====================================================================

            date_str = quote.created_at.strftime('%d/%m/%Y') if quote.created_at else timezone.now().strftime('%d/%m/%Y')
            valid_str = quote.valid_until.strftime('%d/%m/%Y') if quote.valid_until else 'N/A'

            customer_info = f"""<b>Cliente:</b> {quote.customer_name or 'N/A'}<br/>
            <b>Email:</b> {quote.customer_email or 'N/A'}<br/>
            <b>Empresa:</b> {quote.customer_company or 'N/A'}"""

            quote_info = f"""<b>Fecha:</b> {date_str}<br/>
            <b>Válido hasta:</b> {valid_str}<br/>
            <b>Estado:</b> {quote.get_status_display()}"""

            info_data = [
                [Paragraph(customer_info, styles['CustomerInfo']), Paragraph(quote_info, ParagraphStyle(
                    'QuoteInfo', fontSize=10, fontName='Helvetica', textColor=GRAY, leading=14, alignment=TA_RIGHT
                ))],
            ]
            info_table = Table(info_data, colWidths=[content_width / 2, content_width / 2])
            info_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
                ('TOPPADDING', (0, 0), (-1, -1), 12),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
                ('LEFTPADDING', (0, 0), (-1, -1), 12),
                ('RIGHTPADDING', (0, 0), (-1, -1), 12),
                ('BOX', (0, 0), (-1, -1), 1, colors.Color(0.9, 0.9, 0.9)),
            ]))
            elements.append(info_table)
            elements.append(Spacer(1, 20))

            # =====================================================================
            # LINE ITEMS TABLE
            # =====================================================================

            elements.append(Paragraph('DETALLE DE LA COTIZACIÓN', styles['SectionTitle']))

            # Style for table cells (allows text wrapping)
            cell_style = ParagraphStyle(
                'TableCell',
                fontSize=9,
                fontName='Helvetica',
                leading=11,
                textColor=BLACK
            )
            cell_style_right = ParagraphStyle(
                'TableCellRight',
                fontSize=9,
                fontName='Helvetica',
                leading=11,
                textColor=BLACK,
                alignment=TA_RIGHT
            )
            cell_style_center = ParagraphStyle(
                'TableCellCenter',
                fontSize=9,
                fontName='Helvetica',
                leading=11,
                textColor=BLACK,
                alignment=TA_CENTER
            )

            # Table header
            table_data = [
                ['Concepto', 'Descripción', 'Cant.', 'P. Unitario', 'Total']
            ]

            # Table rows - using Paragraph for text wrapping
            for line in quote.lines.all():
                concept = Paragraph(line.concept or '', cell_style)
                description = Paragraph(line.description or '', cell_style)
                qty = Paragraph(str(line.quantity), cell_style_center)
                unit_price = Paragraph(f"${line.unit_price:,.2f}", cell_style_right)
                total = Paragraph(f"${line.line_total:,.2f}", cell_style_right)
                table_data.append([concept, description, qty, unit_price, total])

            # Column widths
            col_widths = [1.6 * inch, 2.7 * inch, 0.5 * inch, 1.0 * inch, 1.1 * inch]

            items_table = Table(table_data, colWidths=col_widths)
            items_table.setStyle(TableStyle([
                # Header styling
                ('BACKGROUND', (0, 0), (-1, 0), CYAN),
                ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                ('TOPPADDING', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 10),

                # Body styling - vertical alignment top for wrapped text
                ('VALIGN', (0, 1), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 1), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
                ('LEFTPADDING', (0, 1), (-1, -1), 4),
                ('RIGHTPADDING', (0, 1), (-1, -1), 4),

                # Alternating row colors
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, LIGHT_GRAY]),

                # Grid
                ('GRID', (0, 0), (-1, -1), 0.5, colors.Color(0.8, 0.8, 0.8)),
                ('BOX', (0, 0), (-1, -1), 1, CYAN),
            ]))
            elements.append(items_table)
            elements.append(Spacer(1, 20))

            # =====================================================================
            # TOTALS SECTION - Keep together to avoid page breaks
            # =====================================================================

            tax_percent = float(quote.tax_rate) * 100

            totals_data = [
                ['', 'Subtotal:', f"${quote.subtotal:,.2f}"],
                ['', f'IVA ({tax_percent:.0f}%):', f"${quote.tax_amount:,.2f}"],
                ['', 'TOTAL:', f"${quote.total:,.2f}"],
            ]

            totals_table = Table(totals_data, colWidths=[content_width - 3 * inch, 1.5 * inch, 1.5 * inch])
            totals_table.setStyle(TableStyle([
                ('FONTNAME', (1, 0), (1, 1), 'Helvetica'),
                ('FONTNAME', (1, 2), (1, 2), 'Helvetica-Bold'),
                ('FONTNAME', (2, 0), (2, 1), 'Helvetica'),
                ('FONTNAME', (2, 2), (2, 2), 'Helvetica-Bold'),
                ('FONTSIZE', (1, 0), (-1, 1), 10),
                ('FONTSIZE', (1, 2), (-1, 2), 12),
                ('TEXTCOLOR', (1, 2), (-1, 2), CYAN),
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('LINEABOVE', (1, 2), (-1, 2), 1, CYAN),
            ]))
            # Wrap totals in KeepTogether to prevent page break in the middle
            elements.append(KeepTogether([totals_table, Spacer(1, 20)]))

            # =====================================================================
            # NOTES SECTION (if any)
            # =====================================================================

            if quote.customer_notes:
                # Wrap notes in KeepTogether to prevent awkward page breaks
                notes_elements = [
                    Paragraph('NOTAS', styles['SectionTitle']),
                    Paragraph(quote.customer_notes, styles['CustomerInfo']),
                    Spacer(1, 20)
                ]
                elements.append(KeepTogether(notes_elements))

            # =====================================================================
            # FOOTER - Fixed at bottom of each page
            # =====================================================================

            # Define footer drawing function
            def draw_footer(canvas_obj, doc_obj):
                """Draw footer at fixed position on each page."""
                canvas_obj.saveState()

                # Footer position - fixed at bottom
                footer_y = 0.5 * inch
                footer_x = margin_left
                footer_width = page_width - margin_left - margin_right

                # Draw divider line
                canvas_obj.setStrokeColor(colors.Color(0.8, 0.8, 0.8))
                canvas_obj.setLineWidth(1)
                canvas_obj.line(footer_x, footer_y + 35, footer_x + footer_width, footer_y + 35)

                # Footer text
                canvas_obj.setFont('Helvetica-Bold', 8)
                canvas_obj.setFillColor(GRAY)
                canvas_obj.drawCentredString(page_width / 2, footer_y + 22, 'MCD Agencia | Acapulco, Guerrero, México')

                canvas_obj.setFont('Helvetica', 8)
                canvas_obj.drawCentredString(page_width / 2, footer_y + 12, 'Precios en MXN. Este documento no es un comprobante fiscal.')
                canvas_obj.drawCentredString(page_width / 2, footer_y + 2, f'Para cualquier duda, contáctenos: {settings.DEFAULT_FROM_EMAIL}')

                # Page number
                canvas_obj.setFont('Helvetica', 7)
                canvas_obj.setFillColor(colors.Color(0.6, 0.6, 0.6))
                page_num = canvas_obj.getPageNumber()
                canvas_obj.drawRightString(page_width - margin_right, footer_y + 2, f'Página {page_num}')

                canvas_obj.restoreState()

            # Build PDF with footer callback
            doc.build(elements, onFirstPage=draw_footer, onLaterPages=draw_footer)
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


def send_quote_email_sync(quote_id: str) -> bool:
    """
    Synchronous function to send quote email.
    Can be called directly without Celery.

    Args:
        quote_id: UUID of the quote.

    Returns:
        bool: True if email was sent successfully.
    """
    from apps.quotes.models import Quote

    try:
        quote = Quote.objects.select_related(
            'quote_request', 'created_by'
        ).prefetch_related('lines').get(id=quote_id)

        # Get recipient info directly from quote
        recipient_email = quote.customer_email
        recipient_name = quote.customer_name

        # Build the quote view URL with token
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        quote_url = f"{frontend_url}/es/cotizacion/{quote.token}" if quote.token else f"{frontend_url}/es/ventas/cotizaciones/{quote.id}"

        context = {
            'quote': quote,
            'recipient_name': recipient_name,
            'quote_url': quote_url,
            'company_name': 'MCD Agencia',
            'lines': quote.lines.all(),
        }

        html_message = render_to_string('emails/quote_ready.html', context)
        plain_message = strip_tags(html_message)

        # Create email with attachment
        email = EmailMessage(
            subject=f'Tu cotización #{quote.quote_number} está lista - MCD Agencia',
            body=html_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient_email],
        )
        email.content_subtype = 'html'

        # Attach PDF if available
        if quote.pdf_file:
            try:
                # Use .read() instead of .path to support cloud storage (R2/S3)
                pdf_data = quote.pdf_file.read()
                email.attach(
                    f'cotizacion-{quote.quote_number}.pdf',
                    pdf_data,
                    'application/pdf'
                )
            except Exception as pdf_error:
                logger.warning(f"Could not attach PDF: {pdf_error}")

        email.send(fail_silently=False)

        logger.info(f"Quote email sent for {quote.quote_number} to {recipient_email}")
        return True

    except Quote.DoesNotExist:
        logger.error(f"Quote {quote_id} not found")
        return False
    except Exception as e:
        logger.error(f"Error sending quote email for {quote_id}: {e}")
        raise


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
)
def send_quote_email(self, quote_id: str):
    """
    Send quote to customer via email with PDF attachment.
    Celery task wrapper for send_quote_email_sync.

    Args:
        quote_id: UUID of the quote.

    Returns:
        bool: True if email was sent successfully.
    """
    return send_quote_email_sync(quote_id)


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
                role__name__in=['admin', 'sales'],
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
            role__name__in=['admin'],
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
