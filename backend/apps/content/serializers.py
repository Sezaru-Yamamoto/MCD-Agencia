"""
Content Serializers for MCD-Agencia.

This module provides serializers for CMS content:
    - Carousel slides
    - Testimonials
    - Client logos
    - FAQs
    - Branch locations
    - Legal pages
    - Site configuration
"""

from rest_framework import serializers

from .models import (
    CarouselSlide,
    Testimonial,
    ClientLogo,
    Service,
    FAQ,
    Branch,
    LegalPage,
    SiteConfiguration,
)


class CarouselSlideSerializer(serializers.ModelSerializer):
    """Serializer for CarouselSlide model with automatic image optimization."""

    class Meta:
        model = CarouselSlide
        fields = [
            'id', 'title', 'title_en', 'subtitle', 'subtitle_en',
            'image', 'mobile_image', 'cta_text', 'cta_text_en',
            'cta_url', 'position', 'is_active'
        ]
        read_only_fields = ['id']

    def validate_image(self, value):
        """Optimize hero image for landing page (1920x1080, high quality WebP)."""
        from apps.catalog.image_utils import validate_image, optimize_for_landing

        is_valid, error = validate_image(value)
        if not is_valid:
            raise serializers.ValidationError(error)

        optimized_file, _ = optimize_for_landing(value, image_type='hero')
        return optimized_file

    def validate_mobile_image(self, value):
        """Optimize mobile image (smaller size)."""
        if not value:
            return value

        from apps.catalog.image_utils import validate_image, optimize_image

        is_valid, error = validate_image(value)
        if not is_valid:
            raise serializers.ValidationError(error)

        # Mobile: 800x600 for better mobile performance
        optimized_file, _ = optimize_image(value, max_size=(800, 600), quality=85)
        return optimized_file


class CarouselSlidePublicSerializer(serializers.ModelSerializer):
    """Public serializer for CarouselSlide (active only)."""

    class Meta:
        model = CarouselSlide
        fields = [
            'id', 'title', 'title_en', 'subtitle', 'subtitle_en',
            'image', 'mobile_image', 'cta_text', 'cta_text_en',
            'cta_url', 'position'
        ]
        read_only_fields = ['id']


class TestimonialSerializer(serializers.ModelSerializer):
    """Serializer for Testimonial model."""

    class Meta:
        model = Testimonial
        fields = [
            'id', 'author_name', 'author_title', 'author_company',
            'content', 'content_en', 'photo', 'rating',
            'position', 'is_active'
        ]
        read_only_fields = ['id']


class TestimonialPublicSerializer(serializers.ModelSerializer):
    """Public serializer for Testimonial (active only)."""

    class Meta:
        model = Testimonial
        fields = [
            'id', 'author_name', 'author_title', 'author_company',
            'content', 'content_en', 'photo', 'rating', 'position'
        ]
        read_only_fields = ['id']


class ClientLogoSerializer(serializers.ModelSerializer):
    """Serializer for ClientLogo model."""

    class Meta:
        model = ClientLogo
        fields = ['id', 'name', 'logo', 'website', 'position', 'is_active']
        read_only_fields = ['id']


class ClientLogoPublicSerializer(serializers.ModelSerializer):
    """Public serializer for ClientLogo (active only)."""

    class Meta:
        model = ClientLogo
        fields = ['id', 'name', 'logo', 'website', 'position']
        read_only_fields = ['id']


class ServiceSerializer(serializers.ModelSerializer):
    """Serializer for Service model with image optimization."""

    class Meta:
        model = Service
        fields = [
            'id', 'name', 'name_en', 'description', 'description_en',
            'icon', 'image', 'price_from', 'cta_text', 'cta_text_en',
            'cta_url', 'is_featured', 'position', 'is_active'
        ]
        read_only_fields = ['id']

    def validate_image(self, value):
        """Optimize service image for landing page."""
        if not value:
            return value

        from apps.catalog.image_utils import validate_image, optimize_for_landing

        is_valid, error = validate_image(value)
        if not is_valid:
            raise serializers.ValidationError(error)

        optimized_file, _ = optimize_for_landing(value, image_type='landing')
        return optimized_file


class ServicePublicSerializer(serializers.ModelSerializer):
    """Public serializer for Service (active only)."""

    class Meta:
        model = Service
        fields = [
            'id', 'name', 'name_en', 'description', 'description_en',
            'icon', 'image', 'price_from', 'cta_text', 'cta_text_en',
            'cta_url', 'is_featured', 'position'
        ]
        read_only_fields = ['id']


class FAQSerializer(serializers.ModelSerializer):
    """Serializer for FAQ model."""

    category_display = serializers.CharField(
        source='get_category_display', read_only=True
    )

    class Meta:
        model = FAQ
        fields = [
            'id', 'question', 'question_en', 'answer', 'answer_en',
            'category', 'category_display', 'position', 'is_active'
        ]
        read_only_fields = ['id']


class FAQPublicSerializer(serializers.ModelSerializer):
    """Public serializer for FAQ (active only)."""

    category_display = serializers.CharField(
        source='get_category_display', read_only=True
    )

    class Meta:
        model = FAQ
        fields = [
            'id', 'question', 'question_en', 'answer', 'answer_en',
            'category', 'category_display', 'position'
        ]
        read_only_fields = ['id']


class BranchSerializer(serializers.ModelSerializer):
    """Serializer for Branch model."""

    full_address = serializers.CharField(read_only=True)

    class Meta:
        model = Branch
        fields = [
            'id', 'name', 'street', 'neighborhood', 'city', 'state',
            'postal_code', 'phone', 'email', 'hours', 'hours_en',
            'latitude', 'longitude', 'google_maps_url', 'image',
            'full_address', 'position', 'is_active'
        ]
        read_only_fields = ['id', 'full_address']


class BranchPublicSerializer(serializers.ModelSerializer):
    """Public serializer for Branch (active only)."""

    full_address = serializers.CharField(read_only=True)

    class Meta:
        model = Branch
        fields = [
            'id', 'name', 'street', 'neighborhood', 'city', 'state',
            'postal_code', 'phone', 'email', 'hours', 'hours_en',
            'latitude', 'longitude', 'google_maps_url', 'image',
            'full_address', 'position'
        ]
        read_only_fields = ['id', 'full_address']


class LegalPageSerializer(serializers.ModelSerializer):
    """Serializer for LegalPage model."""

    type_display = serializers.CharField(
        source='get_type_display', read_only=True
    )

    class Meta:
        model = LegalPage
        fields = [
            'id', 'type', 'type_display', 'title', 'title_en',
            'content', 'content_en', 'version', 'effective_date',
            'is_active', 'meta_title', 'meta_description',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class LegalPagePublicSerializer(serializers.ModelSerializer):
    """Public serializer for LegalPage (active version only)."""

    type_display = serializers.CharField(
        source='get_type_display', read_only=True
    )

    class Meta:
        model = LegalPage
        fields = [
            'id', 'type', 'type_display', 'title', 'title_en',
            'content', 'content_en', 'version', 'effective_date',
            'meta_title', 'meta_description'
        ]
        read_only_fields = ['id']


class SiteConfigurationSerializer(serializers.ModelSerializer):
    """Serializer for SiteConfiguration model."""

    class Meta:
        model = SiteConfiguration
        fields = [
            'id', 'site_name', 'site_name_en', 'tagline', 'tagline_en',
            'contact_email', 'contact_phone', 'whatsapp_number',
            'social_links', 'logo', 'logo_dark', 'favicon',
            'google_analytics_id', 'meta_pixel_id', 'google_tag_manager_id',
            'about_content', 'about_content_en',
            'mission', 'mission_en', 'vision', 'vision_en',
            'values', 'values_en',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SiteConfigurationPublicSerializer(serializers.ModelSerializer):
    """Public serializer for SiteConfiguration (no analytics IDs)."""

    class Meta:
        model = SiteConfiguration
        fields = [
            'id', 'site_name', 'site_name_en', 'tagline', 'tagline_en',
            'contact_email', 'contact_phone', 'whatsapp_number',
            'social_links', 'logo', 'logo_dark', 'favicon',
            'about_content', 'about_content_en',
            'mission', 'mission_en', 'vision', 'vision_en',
            'values', 'values_en'
        ]
        read_only_fields = ['id']


class ContactFormSerializer(serializers.Serializer):
    """Serializer for contact form submissions."""

    name = serializers.CharField(max_length=255, required=True)
    email = serializers.EmailField(required=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    company = serializers.CharField(max_length=255, required=False, allow_blank=True)
    message = serializers.CharField(required=True)
    privacy_accepted = serializers.BooleanField(required=True)

    def validate_privacy_accepted(self, value):
        """Ensure privacy policy is accepted."""
        if not value:
            raise serializers.ValidationError(
                'You must accept the privacy policy.'
            )
        return value


class LandingPageSerializer(serializers.Serializer):
    """
    Aggregated serializer for landing page data.

    Returns all content needed for the landing page in a single request.
    """

    carousel = CarouselSlidePublicSerializer(many=True, read_only=True)
    services = ServicePublicSerializer(many=True, read_only=True)
    testimonials = TestimonialPublicSerializer(many=True, read_only=True)
    clients = ClientLogoPublicSerializer(many=True, read_only=True)
    faqs = FAQPublicSerializer(many=True, read_only=True)
    branches = BranchPublicSerializer(many=True, read_only=True)
    config = SiteConfigurationPublicSerializer(read_only=True)
