"""
Content Models for MCD-Agencia.

This module defines CMS content models for the landing page:
    - CarouselSlide: Hero carousel slides
    - Testimonial: Client testimonials
    - ClientLogo: Client company logos
    - FAQ: Frequently asked questions
    - Branch: Store/office locations
    - LegalPage: Legal documents (terms, privacy, etc.)
    - SiteConfiguration: Global site settings
"""

import uuid

from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel, OrderedModel, SEOModel


class CarouselSlide(TimeStampedModel, OrderedModel):
    """
    Hero carousel slide for the homepage.

    Supports bilingual content and configurable CTAs.

    Attributes:
        title: Slide title (Spanish)
        title_en: Slide title (English)
        subtitle: Slide subtitle
        subtitle_en: Subtitle (English)
        image: Slide image
        mobile_image: Optional mobile-specific image
        cta_text: Call-to-action button text
        cta_text_en: CTA text (English)
        cta_url: CTA button link
        is_active: Whether slide is visible
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    title = models.CharField(
        _('title'),
        max_length=255,
        help_text=_('Slide title in Spanish.')
    )
    title_en = models.CharField(
        _('title (English)'),
        max_length=255,
        blank=True,
        help_text=_('Slide title in English.')
    )
    subtitle = models.CharField(
        _('subtitle'),
        max_length=500,
        blank=True,
        help_text=_('Slide subtitle in Spanish.')
    )
    subtitle_en = models.CharField(
        _('subtitle (English)'),
        max_length=500,
        blank=True,
        help_text=_('Slide subtitle in English.')
    )
    image = models.ImageField(
        _('image'),
        upload_to='content/carousel/',
        help_text=_('Slide image. Recommended: 1920x800px.')
    )
    mobile_image = models.ImageField(
        _('mobile image'),
        upload_to='content/carousel/mobile/',
        blank=True,
        null=True,
        help_text=_('Optional mobile-specific image.')
    )
    cta_text = models.CharField(
        _('CTA text'),
        max_length=50,
        blank=True,
        help_text=_('Call-to-action button text.')
    )
    cta_text_en = models.CharField(
        _('CTA text (English)'),
        max_length=50,
        blank=True,
        help_text=_('CTA text in English.')
    )
    cta_url = models.CharField(
        _('CTA URL'),
        max_length=255,
        blank=True,
        help_text=_('CTA button link (internal or external).')
    )
    is_active = models.BooleanField(
        _('is active'),
        default=True,
        help_text=_('Whether slide is visible.')
    )

    class Meta:
        verbose_name = _('carousel slide')
        verbose_name_plural = _('carousel slides')
        ordering = ['position']

    def __str__(self):
        return self.title


class Testimonial(TimeStampedModel, OrderedModel):
    """
    Client testimonial for social proof.

    Attributes:
        author_name: Author's name
        author_title: Author's job title
        author_company: Author's company
        content: Testimonial text (Spanish)
        content_en: Testimonial text (English)
        photo: Author's photo
        rating: Optional star rating (1-5)
        is_active: Whether testimonial is visible
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    author_name = models.CharField(
        _('author name'),
        max_length=100,
        help_text=_('Author\'s full name.')
    )
    author_title = models.CharField(
        _('author title'),
        max_length=100,
        blank=True,
        help_text=_('Author\'s job title.')
    )
    author_company = models.CharField(
        _('author company'),
        max_length=100,
        blank=True,
        help_text=_('Author\'s company name.')
    )
    content = models.TextField(
        _('content'),
        help_text=_('Testimonial text in Spanish.')
    )
    content_en = models.TextField(
        _('content (English)'),
        blank=True,
        help_text=_('Testimonial text in English.')
    )
    photo = models.ImageField(
        _('photo'),
        upload_to='content/testimonials/',
        blank=True,
        null=True,
        help_text=_('Author\'s photo.')
    )
    rating = models.PositiveSmallIntegerField(
        _('rating'),
        null=True,
        blank=True,
        choices=[(i, str(i)) for i in range(1, 6)],
        help_text=_('Star rating (1-5).')
    )
    is_active = models.BooleanField(
        _('is active'),
        default=True,
        help_text=_('Whether testimonial is visible.')
    )

    class Meta:
        verbose_name = _('testimonial')
        verbose_name_plural = _('testimonials')
        ordering = ['position']

    def __str__(self):
        return f"{self.author_name} - {self.author_company}"


class ClientLogo(TimeStampedModel, OrderedModel):
    """
    Client company logo for trust building.

    Attributes:
        name: Client company name
        logo: Company logo image
        website: Client website URL
        is_active: Whether logo is visible
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    name = models.CharField(
        _('name'),
        max_length=100,
        help_text=_('Client company name.')
    )
    logo = models.ImageField(
        _('logo'),
        upload_to='content/clients/',
        help_text=_('Company logo. Recommended: transparent PNG.')
    )
    website = models.URLField(
        _('website'),
        blank=True,
        help_text=_('Client website URL.')
    )
    is_active = models.BooleanField(
        _('is active'),
        default=True,
        help_text=_('Whether logo is visible.')
    )

    class Meta:
        verbose_name = _('client logo')
        verbose_name_plural = _('client logos')
        ordering = ['position']

    def __str__(self):
        return self.name


class Service(TimeStampedModel, OrderedModel):
    """
    Service offering displayed on the homepage.

    Attributes:
        name: Service name (Spanish)
        name_en: Service name (English)
        description: Service description (Spanish)
        description_en: Description (English)
        icon: Icon class name (e.g., heroicons)
        image: Service image
        price_from: Starting price (optional)
        cta_text: CTA button text
        cta_url: CTA link
        is_featured: Show in featured section
        is_active: Whether service is visible
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    name = models.CharField(
        _('name'),
        max_length=100,
        help_text=_('Service name in Spanish.')
    )
    name_en = models.CharField(
        _('name (English)'),
        max_length=100,
        blank=True,
        help_text=_('Service name in English.')
    )
    description = models.TextField(
        _('description'),
        help_text=_('Service description in Spanish.')
    )
    description_en = models.TextField(
        _('description (English)'),
        blank=True,
        help_text=_('Service description in English.')
    )
    icon = models.CharField(
        _('icon'),
        max_length=100,
        blank=True,
        help_text=_('Icon identifier (e.g., "printer", "truck", "photo").')
    )
    image = models.ImageField(
        _('image'),
        upload_to='content/services/',
        blank=True,
        null=True,
        help_text=_('Service image.')
    )
    price_from = models.DecimalField(
        _('price from'),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_('Starting price (optional).')
    )
    cta_text = models.CharField(
        _('CTA text'),
        max_length=50,
        blank=True,
        default='Cotizar',
        help_text=_('Call-to-action button text.')
    )
    cta_text_en = models.CharField(
        _('CTA text (English)'),
        max_length=50,
        blank=True,
        default='Quote',
        help_text=_('CTA text in English.')
    )
    cta_url = models.CharField(
        _('CTA URL'),
        max_length=255,
        blank=True,
        default='#cotizar',
        help_text=_('CTA button link.')
    )
    is_featured = models.BooleanField(
        _('is featured'),
        default=False,
        help_text=_('Show in featured services section.')
    )
    is_active = models.BooleanField(
        _('is active'),
        default=True,
        help_text=_('Whether service is visible.')
    )

    class Meta:
        verbose_name = _('service')
        verbose_name_plural = _('services')
        ordering = ['position']

    def __str__(self):
        return self.name


class FAQ(TimeStampedModel, OrderedModel):
    """
    Frequently asked question for support.

    Attributes:
        question: Question text (Spanish)
        question_en: Question text (English)
        answer: Answer text (Spanish)
        answer_en: Answer text (English)
        category: Optional category grouping
        is_active: Whether FAQ is visible
    """

    CATEGORY_CHOICES = [
        ('general', _('General')),
        ('products', _('Products & Services')),
        ('orders', _('Orders & Delivery')),
        ('payments', _('Payments')),
        ('quotes', _('Quotes')),
        ('support', _('Support')),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    question = models.CharField(
        _('question'),
        max_length=500,
        help_text=_('Question in Spanish.')
    )
    question_en = models.CharField(
        _('question (English)'),
        max_length=500,
        blank=True,
        help_text=_('Question in English.')
    )
    answer = models.TextField(
        _('answer'),
        help_text=_('Answer in Spanish.')
    )
    answer_en = models.TextField(
        _('answer (English)'),
        blank=True,
        help_text=_('Answer in English.')
    )
    category = models.CharField(
        _('category'),
        max_length=20,
        choices=CATEGORY_CHOICES,
        default='general',
        help_text=_('FAQ category.')
    )
    is_active = models.BooleanField(
        _('is active'),
        default=True,
        help_text=_('Whether FAQ is visible.')
    )

    class Meta:
        verbose_name = _('FAQ')
        verbose_name_plural = _('FAQs')
        ordering = ['category', 'position']

    def __str__(self):
        return self.question[:50]


class Branch(TimeStampedModel, OrderedModel):
    """
    Store/office location information.

    Attributes:
        name: Branch name
        address: Full address
        phone: Contact phone numbers
        email: Contact email
        hours: Operating hours
        hours_en: Hours in English
        latitude: Map latitude
        longitude: Map longitude
        image: Branch photo
        is_active: Whether branch is visible
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    name = models.CharField(
        _('name'),
        max_length=100,
        help_text=_('Branch name.')
    )
    street = models.CharField(
        _('street'),
        max_length=255,
        help_text=_('Street address.')
    )
    neighborhood = models.CharField(
        _('neighborhood'),
        max_length=100,
        help_text=_('Neighborhood (colonia).')
    )
    city = models.CharField(
        _('city'),
        max_length=100,
        help_text=_('City.')
    )
    state = models.CharField(
        _('state'),
        max_length=100,
        help_text=_('State.')
    )
    postal_code = models.CharField(
        _('postal code'),
        max_length=10,
        help_text=_('Postal code.')
    )
    phone = models.CharField(
        _('phone'),
        max_length=100,
        help_text=_('Contact phone number(s).')
    )
    email = models.EmailField(
        _('email'),
        help_text=_('Contact email.')
    )
    hours = models.TextField(
        _('hours'),
        help_text=_('Operating hours in Spanish.')
    )
    hours_en = models.TextField(
        _('hours (English)'),
        blank=True,
        help_text=_('Operating hours in English.')
    )
    latitude = models.DecimalField(
        _('latitude'),
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        help_text=_('Map latitude coordinate.')
    )
    longitude = models.DecimalField(
        _('longitude'),
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        help_text=_('Map longitude coordinate.')
    )
    google_maps_url = models.URLField(
        _('Google Maps URL'),
        blank=True,
        help_text=_('Direct link to Google Maps.')
    )
    image = models.ImageField(
        _('image'),
        upload_to='content/branches/',
        blank=True,
        null=True,
        help_text=_('Branch photo.')
    )
    is_active = models.BooleanField(
        _('is active'),
        default=True,
        help_text=_('Whether branch is visible.')
    )

    class Meta:
        verbose_name = _('branch')
        verbose_name_plural = _('branches')
        ordering = ['position']

    def __str__(self):
        return self.name

    @property
    def full_address(self):
        """Return formatted full address."""
        return f"{self.street}, {self.neighborhood}, {self.city}, {self.state}, C.P. {self.postal_code}"


class LegalPage(TimeStampedModel, SEOModel):
    """
    Legal document page (terms, privacy, cookies).

    Supports versioning for compliance tracking.

    Attributes:
        type: Page type (terms, privacy, cookies)
        title: Page title (Spanish)
        title_en: Page title (English)
        content: Page content (Spanish)
        content_en: Page content (English)
        version: Document version
        effective_date: When this version becomes effective
        is_active: Whether this is the active version
    """

    TYPE_CHOICES = [
        ('terms', _('Terms and Conditions')),
        ('privacy', _('Privacy Policy')),
        ('cookies', _('Cookie Policy')),
        ('legal', _('Legal Notice')),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    type = models.CharField(
        _('type'),
        max_length=20,
        choices=TYPE_CHOICES,
        help_text=_('Document type.')
    )
    title = models.CharField(
        _('title'),
        max_length=255,
        help_text=_('Page title in Spanish.')
    )
    title_en = models.CharField(
        _('title (English)'),
        max_length=255,
        blank=True,
        help_text=_('Page title in English.')
    )
    content = models.TextField(
        _('content'),
        help_text=_('Page content in Spanish (supports Markdown).')
    )
    content_en = models.TextField(
        _('content (English)'),
        blank=True,
        help_text=_('Page content in English (supports Markdown).')
    )
    version = models.CharField(
        _('version'),
        max_length=20,
        default='1.0',
        help_text=_('Document version (e.g., 1.0, 1.1).')
    )
    effective_date = models.DateField(
        _('effective date'),
        help_text=_('When this version becomes effective.')
    )
    is_active = models.BooleanField(
        _('is active'),
        default=True,
        help_text=_('Whether this is the active version.')
    )

    class Meta:
        verbose_name = _('legal page')
        verbose_name_plural = _('legal pages')
        ordering = ['type', '-effective_date']
        unique_together = ['type', 'version']

    def __str__(self):
        return f"{self.get_type_display()} v{self.version}"


class SiteConfiguration(TimeStampedModel):
    """
    Global site configuration singleton.

    Stores site-wide settings that can be edited via admin.

    Attributes:
        site_name: Site name
        tagline: Site tagline
        contact_email: Main contact email
        contact_phone: Main contact phone
        social_links: Social media links (JSON)
        logo: Site logo
        favicon: Site favicon
        analytics_id: Google Analytics ID
        meta_pixel_id: Meta Pixel ID
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    site_name = models.CharField(
        _('site name'),
        max_length=100,
        default='Agencia MCD',
        help_text=_('Site name.')
    )
    site_name_en = models.CharField(
        _('site name (English)'),
        max_length=100,
        blank=True,
        help_text=_('Site name in English.')
    )
    tagline = models.CharField(
        _('tagline'),
        max_length=255,
        blank=True,
        help_text=_('Site tagline in Spanish.')
    )
    tagline_en = models.CharField(
        _('tagline (English)'),
        max_length=255,
        blank=True,
        help_text=_('Site tagline in English.')
    )

    # Contact
    contact_email = models.EmailField(
        _('contact email'),
        help_text=_('Main contact email.')
    )
    contact_phone = models.CharField(
        _('contact phone'),
        max_length=20,
        help_text=_('Main contact phone.')
    )
    whatsapp_number = models.CharField(
        _('WhatsApp number'),
        max_length=20,
        blank=True,
        help_text=_('WhatsApp number for chat.')
    )

    # Social
    social_links = models.JSONField(
        _('social links'),
        default=dict,
        blank=True,
        help_text=_('Social media links as JSON.')
    )

    # Branding
    logo = models.ImageField(
        _('logo'),
        upload_to='content/branding/',
        blank=True,
        null=True,
        help_text=_('Site logo.')
    )
    logo_dark = models.ImageField(
        _('logo (dark)'),
        upload_to='content/branding/',
        blank=True,
        null=True,
        help_text=_('Logo for dark backgrounds.')
    )
    favicon = models.ImageField(
        _('favicon'),
        upload_to='content/branding/',
        blank=True,
        null=True,
        help_text=_('Site favicon.')
    )

    # Analytics
    google_analytics_id = models.CharField(
        _('Google Analytics ID'),
        max_length=50,
        blank=True,
        help_text=_('GA4 Measurement ID.')
    )
    meta_pixel_id = models.CharField(
        _('Meta Pixel ID'),
        max_length=50,
        blank=True,
        help_text=_('Facebook/Meta Pixel ID.')
    )
    google_tag_manager_id = models.CharField(
        _('GTM ID'),
        max_length=50,
        blank=True,
        help_text=_('Google Tag Manager ID.')
    )

    # About
    about_content = models.TextField(
        _('about content'),
        blank=True,
        help_text=_('About section content in Spanish.')
    )
    about_content_en = models.TextField(
        _('about content (English)'),
        blank=True,
        help_text=_('About section content in English.')
    )
    mission = models.TextField(
        _('mission'),
        blank=True,
        help_text=_('Company mission in Spanish.')
    )
    mission_en = models.TextField(
        _('mission (English)'),
        blank=True,
        help_text=_('Company mission in English.')
    )
    vision = models.TextField(
        _('vision'),
        blank=True,
        help_text=_('Company vision in Spanish.')
    )
    vision_en = models.TextField(
        _('vision (English)'),
        blank=True,
        help_text=_('Company vision in English.')
    )
    values = models.TextField(
        _('values'),
        blank=True,
        help_text=_('Company values in Spanish.')
    )
    values_en = models.TextField(
        _('values (English)'),
        blank=True,
        help_text=_('Company values in English.')
    )

    class Meta:
        verbose_name = _('site configuration')
        verbose_name_plural = _('site configuration')

    def __str__(self):
        return self.site_name

    def save(self, *args, **kwargs):
        """Ensure only one configuration exists (singleton)."""
        if not self.pk and SiteConfiguration.objects.exists():
            raise ValueError("Only one site configuration can exist")
        super().save(*args, **kwargs)

    @classmethod
    def get_config(cls):
        """Get or create the site configuration."""
        config, _ = cls.objects.get_or_create(
            defaults={'contact_email': 'info@agenciamcd.mx', 'contact_phone': '+52 744 000 0000'}
        )
        return config
