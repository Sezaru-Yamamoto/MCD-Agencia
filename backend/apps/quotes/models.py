"""
Quote Models for MCD-Agencia.

This module defines the Request for Quote (RFQ) system:
    - QuoteRequest: Initial request from customer
    - Quote: Response quotation from sales team
    - QuoteLine: Line items in a quote
    - QuoteAttachment: Files attached to requests/quotes

Quote Workflow:
    1. Customer submits QuoteRequest
    2. Sales team reviews and creates Quote
    3. Quote is sent to customer (email + web link)
    4. Customer accepts → converts to Order
    5. Customer pays → order processing begins
"""

import uuid
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel, SoftDeleteModel


def get_default_validity_date():
    """Return default quote validity date (15 days from now)."""
    return timezone.now() + timedelta(days=settings.QUOTE_DEFAULT_VALIDITY_DAYS)


class QuoteRequest(TimeStampedModel, SoftDeleteModel):
    """
    Request for Quote (RFQ) from customer.

    Customers (guests or authenticated) can submit quote requests
    for products/services. These are reviewed by the sales team.

    Attributes:
        status: Request status (draft, in_review, quoted, etc.)
        customer_name: Customer's name
        customer_email: Customer's email
        customer_phone: Customer's phone
        customer_company: Customer's company (optional)
        catalog_item: Requested product/service
        quantity: Requested quantity
        dimensions: Requested dimensions (if applicable)
        material: Requested material (if applicable)
        includes_installation: Whether installation is needed
        description: Additional details
        assigned_to: Sales rep assigned to request
        ip_address: Customer's IP (for anti-spam)
        user: Authenticated user (if logged in)
    """

    STATUS_DRAFT = 'draft'
    STATUS_IN_REVIEW = 'in_review'
    STATUS_INFO_REQUESTED = 'info_requested'
    STATUS_QUOTED = 'quoted'
    STATUS_ACCEPTED = 'accepted'
    STATUS_REJECTED = 'rejected'
    STATUS_EXPIRED = 'expired'

    STATUS_CHOICES = [
        (STATUS_DRAFT, _('Draft')),
        (STATUS_IN_REVIEW, _('In Review')),
        (STATUS_INFO_REQUESTED, _('Info Requested')),
        (STATUS_QUOTED, _('Quote Sent')),
        (STATUS_ACCEPTED, _('Accepted')),
        (STATUS_REJECTED, _('Rejected')),
        (STATUS_EXPIRED, _('Expired')),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    request_number = models.CharField(
        _('request number'),
        max_length=20,
        unique=True,
        db_index=True,
        help_text=_('Human-readable request number.')
    )
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_DRAFT,
        db_index=True,
        help_text=_('Current request status.')
    )

    # Customer Information
    customer_name = models.CharField(
        _('customer name'),
        max_length=255,
        help_text=_('Customer\'s full name.')
    )
    customer_email = models.EmailField(
        _('customer email'),
        help_text=_('Customer\'s email address.')
    )
    customer_phone = models.CharField(
        _('customer phone'),
        max_length=20,
        blank=True,
        help_text=_('Customer\'s phone number.')
    )
    customer_company = models.CharField(
        _('customer company'),
        max_length=255,
        blank=True,
        help_text=_('Customer\'s company name.')
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='quote_requests',
        help_text=_('Authenticated user (if logged in).')
    )

    # Requested Item
    catalog_item = models.ForeignKey(
        'catalog.CatalogItem',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='quote_requests',
        help_text=_('Requested product/service.')
    )
    catalog_item_name = models.CharField(
        _('item name'),
        max_length=255,
        blank=True,
        help_text=_('Name of requested item (preserved if item deleted).')
    )

    # Request Details
    quantity = models.PositiveIntegerField(
        _('quantity'),
        default=1,
        help_text=_('Requested quantity.')
    )
    dimensions = models.CharField(
        _('dimensions'),
        max_length=100,
        blank=True,
        help_text=_('Requested dimensions (e.g., "3x2m").')
    )
    material = models.CharField(
        _('material'),
        max_length=100,
        blank=True,
        help_text=_('Requested material.')
    )
    includes_installation = models.BooleanField(
        _('includes installation'),
        default=False,
        help_text=_('Whether installation is requested.')
    )
    description = models.TextField(
        _('description'),
        blank=True,
        help_text=_('Additional details and requirements.')
    )

    # Assignment
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_quote_requests',
        help_text=_('Sales rep assigned to this request.')
    )

    # Tracking
    ip_address = models.GenericIPAddressField(
        _('IP address'),
        null=True,
        blank=True,
        help_text=_('Customer\'s IP address.')
    )
    user_agent = models.TextField(
        _('user agent'),
        blank=True,
        help_text=_('Customer\'s browser/device info.')
    )
    preferred_language = models.CharField(
        _('preferred language'),
        max_length=2,
        choices=[('es', 'Español'), ('en', 'English')],
        default='es',
        help_text=_('Preferred language for communication.')
    )

    class Meta:
        verbose_name = _('quote request')
        verbose_name_plural = _('quote requests')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['request_number']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['assigned_to', 'status']),
            models.Index(fields=['customer_email']),
        ]

    def __str__(self):
        return f"RFQ-{self.request_number}"

    def save(self, *args, **kwargs):
        """Generate request number and preserve item name."""
        if not self.request_number:
            self.request_number = self._generate_request_number()
        if self.catalog_item and not self.catalog_item_name:
            self.catalog_item_name = self.catalog_item.name
        super().save(*args, **kwargs)

    def _generate_request_number(self):
        """Generate a unique request number."""
        import datetime
        import random
        date_str = datetime.datetime.now().strftime('%Y%m%d')
        random_str = ''.join(random.choices('0123456789', k=4))
        return f"{date_str}-{random_str}"


class Quote(TimeStampedModel, SoftDeleteModel):
    """
    Quotation response from sales team.

    Quotes are created in response to QuoteRequests and contain
    itemized pricing. They can be converted to orders upon acceptance.

    Attributes:
        quote_number: Human-readable quote number (folio)
        quote_request: Source request
        status: Quote status
        customer: Customer user
        customer_email: Customer email for notifications
        valid_until: Quote validity date
        subtotal: Quote subtotal
        tax_rate: Applied tax rate
        tax_amount: Tax amount
        total: Quote total
        terms: Commercial terms
        internal_notes: Staff notes
        token: Secure access token
        pdf_file: Generated PDF file
        sent_at: When quote was sent
        viewed_at: When customer viewed quote
        accepted_at: When customer accepted
    """

    STATUS_DRAFT = 'draft'
    STATUS_SENT = 'sent'
    STATUS_VIEWED = 'viewed'
    STATUS_ACCEPTED = 'accepted'
    STATUS_REJECTED = 'rejected'
    STATUS_EXPIRED = 'expired'
    STATUS_CONVERTED = 'converted'

    STATUS_CHOICES = [
        (STATUS_DRAFT, _('Draft')),
        (STATUS_SENT, _('Sent')),
        (STATUS_VIEWED, _('Viewed')),
        (STATUS_ACCEPTED, _('Accepted')),
        (STATUS_REJECTED, _('Rejected')),
        (STATUS_EXPIRED, _('Expired')),
        (STATUS_CONVERTED, _('Converted to Order')),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    quote_number = models.CharField(
        _('quote number'),
        max_length=20,
        unique=True,
        db_index=True,
        help_text=_('Human-readable quote number (folio).')
    )
    quote_request = models.ForeignKey(
        QuoteRequest,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='quotes',
        help_text=_('Source quote request.')
    )
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_DRAFT,
        db_index=True,
        help_text=_('Current quote status.')
    )
    version = models.PositiveIntegerField(
        _('version'),
        default=1,
        help_text=_('Quote version number.')
    )

    # Customer
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='quotes',
        help_text=_('Customer user.')
    )
    customer_name = models.CharField(
        _('customer name'),
        max_length=255,
        help_text=_('Customer\'s name.')
    )
    customer_email = models.EmailField(
        _('customer email'),
        help_text=_('Customer\'s email for notifications.')
    )
    customer_company = models.CharField(
        _('customer company'),
        max_length=255,
        blank=True,
        help_text=_('Customer\'s company.')
    )

    # Sales
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_quotes',
        help_text=_('Sales rep who created quote.')
    )

    # Validity
    valid_until = models.DateTimeField(
        _('valid until'),
        default=get_default_validity_date,
        help_text=_('Quote validity date.')
    )

    # Financials
    subtotal = models.DecimalField(
        _('subtotal'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_('Quote subtotal before tax.')
    )
    tax_rate = models.DecimalField(
        _('tax rate'),
        max_digits=5,
        decimal_places=4,
        default=Decimal('0.1600'),
        help_text=_('Applied tax rate.')
    )
    tax_amount = models.DecimalField(
        _('tax amount'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_('Tax amount.')
    )
    total = models.DecimalField(
        _('total'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_('Quote total.')
    )
    currency = models.CharField(
        _('currency'),
        max_length=3,
        default='MXN',
        help_text=_('Currency code.')
    )

    # Payment
    payment_mode = models.CharField(
        _('payment mode'),
        max_length=20,
        choices=[('FULL', _('Full')), ('DEPOSIT_ALLOWED', _('Deposit'))],
        default='FULL',
        help_text=_('Payment requirements.')
    )
    deposit_percentage = models.DecimalField(
        _('deposit percentage'),
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_('Deposit percentage if applicable.')
    )

    # Terms
    terms = models.TextField(
        _('commercial terms'),
        blank=True,
        help_text=_('Commercial terms and conditions.')
    )
    terms_en = models.TextField(
        _('commercial terms (English)'),
        blank=True,
        help_text=_('Terms in English.')
    )
    internal_notes = models.TextField(
        _('internal notes'),
        blank=True,
        help_text=_('Staff notes (not visible to customer).')
    )

    # Access
    token = models.UUIDField(
        _('access token'),
        default=uuid.uuid4,
        unique=True,
        help_text=_('Secure access token for customer link.')
    )

    # Files
    pdf_file = models.FileField(
        _('PDF file'),
        upload_to='quotes/pdfs/',
        blank=True,
        null=True,
        help_text=_('Generated PDF file.')
    )
    pdf_file_en = models.FileField(
        _('PDF file (English)'),
        upload_to='quotes/pdfs/',
        blank=True,
        null=True,
        help_text=_('English PDF file.')
    )

    # Tracking
    sent_at = models.DateTimeField(
        _('sent at'),
        null=True,
        blank=True,
        help_text=_('When quote was sent to customer.')
    )
    viewed_at = models.DateTimeField(
        _('viewed at'),
        null=True,
        blank=True,
        help_text=_('When customer first viewed quote.')
    )
    accepted_at = models.DateTimeField(
        _('accepted at'),
        null=True,
        blank=True,
        help_text=_('When customer accepted quote.')
    )
    rejected_at = models.DateTimeField(
        _('rejected at'),
        null=True,
        blank=True,
        help_text=_('When customer rejected quote.')
    )

    # Language
    language = models.CharField(
        _('language'),
        max_length=2,
        choices=[('es', 'Español'), ('en', 'English')],
        default='es',
        help_text=_('Primary language for quote.')
    )

    class Meta:
        verbose_name = _('quote')
        verbose_name_plural = _('quotes')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['quote_number']),
            models.Index(fields=['token']),
            models.Index(fields=['status', 'valid_until']),
            models.Index(fields=['customer_email']),
        ]

    def __str__(self):
        return f"Quote {self.quote_number}"

    def save(self, *args, **kwargs):
        """Generate quote number and calculate totals."""
        if not self.quote_number:
            self.quote_number = self._generate_quote_number()
        super().save(*args, **kwargs)

    def _generate_quote_number(self):
        """Generate a unique quote number."""
        import datetime
        import random
        date_str = datetime.datetime.now().strftime('%Y%m%d')
        random_str = ''.join(random.choices('0123456789', k=4))
        return f"COT-{date_str}-{random_str}"

    @property
    def is_expired(self):
        """Check if quote has expired."""
        return timezone.now() > self.valid_until

    @property
    def is_valid(self):
        """Check if quote is still valid for acceptance."""
        return (
            self.status in [self.STATUS_SENT, self.STATUS_VIEWED] and
            not self.is_expired
        )

    @property
    def deposit_amount(self):
        """Calculate deposit amount if applicable."""
        if self.payment_mode == 'DEPOSIT_ALLOWED' and self.deposit_percentage:
            return self.total * (self.deposit_percentage / Decimal('100'))
        return self.total

    def calculate_totals(self):
        """Recalculate quote totals from line items."""
        self.subtotal = sum(line.line_total for line in self.lines.all())
        self.tax_amount = self.subtotal * self.tax_rate
        self.total = self.subtotal + self.tax_amount

    def mark_as_viewed(self):
        """Mark quote as viewed by customer."""
        if not self.viewed_at:
            self.viewed_at = timezone.now()
            if self.status == self.STATUS_SENT:
                self.status = self.STATUS_VIEWED
            self.save(update_fields=['viewed_at', 'status', 'updated_at'])

    def get_web_url(self):
        """Get the customer-facing web URL for this quote."""
        return f"/cotizaciones/{self.token}"


class QuoteLine(TimeStampedModel):
    """
    Individual line item in a quote.

    Each line represents a product/service with quantity and pricing.

    Attributes:
        quote: Parent quote
        catalog_item: Source product/service
        description: Line item description
        description_en: Description in English
        quantity: Quantity
        unit: Unit of measure
        unit_price: Price per unit
        line_total: Line total
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    quote = models.ForeignKey(
        Quote,
        on_delete=models.CASCADE,
        related_name='lines',
        help_text=_('Parent quote.')
    )
    catalog_item = models.ForeignKey(
        'catalog.CatalogItem',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='quote_lines',
        help_text=_('Source product/service.')
    )

    # Line Details
    concept = models.CharField(
        _('concept'),
        max_length=255,
        help_text=_('Line item concept/name.')
    )
    concept_en = models.CharField(
        _('concept (English)'),
        max_length=255,
        blank=True,
        help_text=_('Concept in English.')
    )
    description = models.TextField(
        _('description'),
        blank=True,
        help_text=_('Detailed description.')
    )
    description_en = models.TextField(
        _('description (English)'),
        blank=True,
        help_text=_('Description in English.')
    )
    quantity = models.DecimalField(
        _('quantity'),
        max_digits=10,
        decimal_places=2,
        default=Decimal('1.00'),
        help_text=_('Quantity.')
    )
    unit = models.CharField(
        _('unit'),
        max_length=20,
        default='pz',
        help_text=_('Unit of measure (pz, m², kg, etc.).')
    )
    unit_price = models.DecimalField(
        _('unit price'),
        max_digits=12,
        decimal_places=2,
        help_text=_('Price per unit.')
    )
    line_total = models.DecimalField(
        _('line total'),
        max_digits=12,
        decimal_places=2,
        help_text=_('Line total.')
    )

    # Ordering
    position = models.PositiveIntegerField(
        _('position'),
        default=0,
        help_text=_('Display order.')
    )

    class Meta:
        verbose_name = _('quote line')
        verbose_name_plural = _('quote lines')
        ordering = ['position', 'created_at']

    def __str__(self):
        return f"{self.quantity} {self.unit} x {self.concept}"

    def save(self, *args, **kwargs):
        """Calculate line total before saving."""
        self.line_total = self.unit_price * self.quantity
        super().save(*args, **kwargs)


class QuoteAttachment(TimeStampedModel):
    """
    File attachments for quote requests and quotes.

    Supports artwork, references, and other files from customers.

    Attributes:
        quote_request: Source request
        quote: Source quote
        file: Uploaded file
        filename: Original filename
        file_type: MIME type
        file_size: Size in bytes
        description: File description
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    quote_request = models.ForeignKey(
        QuoteRequest,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='attachments',
        help_text=_('Source quote request.')
    )
    quote = models.ForeignKey(
        Quote,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='attachments',
        help_text=_('Source quote.')
    )
    file = models.FileField(
        _('file'),
        upload_to='quotes/attachments/',
        help_text=_('Uploaded file.')
    )
    filename = models.CharField(
        _('filename'),
        max_length=255,
        help_text=_('Original filename.')
    )
    file_type = models.CharField(
        _('file type'),
        max_length=100,
        blank=True,
        help_text=_('MIME type.')
    )
    file_size = models.PositiveIntegerField(
        _('file size'),
        default=0,
        help_text=_('Size in bytes.')
    )
    description = models.CharField(
        _('description'),
        max_length=255,
        blank=True,
        help_text=_('File description.')
    )

    class Meta:
        verbose_name = _('quote attachment')
        verbose_name_plural = _('quote attachments')
        ordering = ['created_at']

    def __str__(self):
        return self.filename

    def save(self, *args, **kwargs):
        """Extract file metadata before saving."""
        if self.file:
            if not self.filename:
                self.filename = self.file.name
            if not self.file_size:
                self.file_size = self.file.size
        super().save(*args, **kwargs)
