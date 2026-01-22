"""
Content Views for MCD-Agencia.

This module provides ViewSets for CMS content:
    - Public landing page data
    - Admin content management
"""

from django.utils.translation import gettext_lazy as _
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.models import AuditLog
from apps.chatbot.models import Lead
from apps.core.pagination import StandardPagination
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
from .serializers import (
    CarouselSlideSerializer,
    CarouselSlidePublicSerializer,
    TestimonialSerializer,
    TestimonialPublicSerializer,
    ClientLogoSerializer,
    ClientLogoPublicSerializer,
    ServiceSerializer,
    ServicePublicSerializer,
    FAQSerializer,
    FAQPublicSerializer,
    BranchSerializer,
    BranchPublicSerializer,
    LegalPageSerializer,
    LegalPagePublicSerializer,
    SiteConfigurationSerializer,
    SiteConfigurationPublicSerializer,
    ContactFormSerializer,
    LandingPageSerializer,
)


class LandingPageView(APIView):
    """
    Get all landing page data in a single request.

    GET /api/v1/content/landing/
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """Return aggregated landing page data."""
        data = {
            'carousel': CarouselSlide.objects.filter(is_active=True).order_by('position'),
            'services': Service.objects.filter(is_active=True).order_by('position'),
            'testimonials': Testimonial.objects.filter(is_active=True).order_by('position'),
            'clients': ClientLogo.objects.filter(is_active=True).order_by('position'),
            'faqs': FAQ.objects.filter(is_active=True).order_by('category', 'position'),
            'branches': Branch.objects.filter(is_active=True).order_by('position'),
            'config': SiteConfiguration.get_config(),
        }

        return Response({
            'carousel': CarouselSlidePublicSerializer(
                data['carousel'], many=True, context={'request': request}
            ).data,
            'services': ServicePublicSerializer(
                data['services'], many=True, context={'request': request}
            ).data,
            'testimonials': TestimonialPublicSerializer(
                data['testimonials'], many=True, context={'request': request}
            ).data,
            'clients': ClientLogoPublicSerializer(
                data['clients'], many=True, context={'request': request}
            ).data,
            'faqs': FAQPublicSerializer(
                data['faqs'], many=True, context={'request': request}
            ).data,
            'branches': BranchPublicSerializer(
                data['branches'], many=True, context={'request': request}
            ).data,
            'config': SiteConfigurationPublicSerializer(
                data['config'], context={'request': request}
            ).data,
        })


class ContactFormView(APIView):
    """
    Handle contact form submissions.

    POST /api/v1/content/contact/
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        """Process contact form submission."""
        serializer = ContactFormSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Create lead from contact form
        lead = Lead.objects.create(
            name=serializer.validated_data['name'],
            email=serializer.validated_data['email'],
            phone=serializer.validated_data.get('phone', ''),
            company=serializer.validated_data.get('company', ''),
            message=serializer.validated_data['message'],
            source='contact_form',
            ip_address=self._get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]
        )

        AuditLog.log(
            entity=lead,
            action=AuditLog.ACTION_CREATED,
            request=request,
            metadata={'source': 'contact_form'}
        )

        # TODO: Send notification email to team

        return Response({
            'message': _('Thank you for your message. We will contact you soon.')
        })

    def _get_client_ip(self, request):
        """Get client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')


class CarouselSlideViewSet(viewsets.ModelViewSet):
    """
    ViewSet for carousel slide management.

    Public: GET /api/v1/content/carousel/
    Admin: All CRUD operations
    """

    serializer_class = CarouselSlideSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        """Return slides based on user role."""
        if self.request.user.is_staff:
            return CarouselSlide.objects.all().order_by('position')
        return CarouselSlide.objects.filter(is_active=True).order_by('position')

    def get_serializer_class(self):
        """Return appropriate serializer."""
        if not self.request.user.is_staff:
            return CarouselSlidePublicSerializer
        return CarouselSlideSerializer

    def get_permissions(self):
        """Set permissions based on action."""
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def perform_create(self, serializer):
        """Log slide creation."""
        slide = serializer.save()
        AuditLog.log(
            entity=slide,
            action=AuditLog.ACTION_CREATED,
            actor=self.request.user,
            after_state=CarouselSlideSerializer(slide).data,
            request=self.request
        )

    def perform_update(self, serializer):
        """Log slide update."""
        before_state = CarouselSlideSerializer(self.get_object()).data
        slide = serializer.save()
        AuditLog.log(
            entity=slide,
            action=AuditLog.ACTION_UPDATED,
            actor=self.request.user,
            before_state=before_state,
            after_state=CarouselSlideSerializer(slide).data,
            request=self.request
        )


class TestimonialViewSet(viewsets.ModelViewSet):
    """ViewSet for testimonial management."""

    serializer_class = TestimonialSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        """Return testimonials based on user role."""
        if self.request.user.is_staff:
            return Testimonial.objects.all().order_by('position')
        return Testimonial.objects.filter(is_active=True).order_by('position')

    def get_serializer_class(self):
        """Return appropriate serializer."""
        if not self.request.user.is_staff:
            return TestimonialPublicSerializer
        return TestimonialSerializer

    def get_permissions(self):
        """Set permissions based on action."""
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]


class ClientLogoViewSet(viewsets.ModelViewSet):
    """ViewSet for client logo management."""

    serializer_class = ClientLogoSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        """Return logos based on user role."""
        if self.request.user.is_staff:
            return ClientLogo.objects.all().order_by('position')
        return ClientLogo.objects.filter(is_active=True).order_by('position')

    def get_serializer_class(self):
        """Return appropriate serializer."""
        if not self.request.user.is_staff:
            return ClientLogoPublicSerializer
        return ClientLogoSerializer

    def get_permissions(self):
        """Set permissions based on action."""
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]


class ServiceViewSet(viewsets.ModelViewSet):
    """ViewSet for service management."""

    serializer_class = ServiceSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        """Return services based on user role."""
        if self.request.user.is_staff:
            return Service.objects.all().order_by('position')
        return Service.objects.filter(is_active=True).order_by('position')

    def get_serializer_class(self):
        """Return appropriate serializer."""
        if not self.request.user.is_staff:
            return ServicePublicSerializer
        return ServiceSerializer

    def get_permissions(self):
        """Set permissions based on action."""
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Get featured services."""
        services = Service.objects.filter(is_active=True, is_featured=True).order_by('position')
        serializer = ServicePublicSerializer(services, many=True, context={'request': request})
        return Response(serializer.data)


class FAQViewSet(viewsets.ModelViewSet):
    """ViewSet for FAQ management."""

    serializer_class = FAQSerializer
    pagination_class = StandardPagination
    filterset_fields = ['category']

    def get_queryset(self):
        """Return FAQs based on user role."""
        if self.request.user.is_staff:
            return FAQ.objects.all().order_by('category', 'position')
        return FAQ.objects.filter(is_active=True).order_by('category', 'position')

    def get_serializer_class(self):
        """Return appropriate serializer."""
        if not self.request.user.is_staff:
            return FAQPublicSerializer
        return FAQSerializer

    def get_permissions(self):
        """Set permissions based on action."""
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Get list of FAQ categories."""
        return Response([
            {'value': choice[0], 'label': str(choice[1])}
            for choice in FAQ.CATEGORY_CHOICES
        ])


class BranchViewSet(viewsets.ModelViewSet):
    """ViewSet for branch management."""

    serializer_class = BranchSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        """Return branches based on user role."""
        if self.request.user.is_staff:
            return Branch.objects.all().order_by('position')
        return Branch.objects.filter(is_active=True).order_by('position')

    def get_serializer_class(self):
        """Return appropriate serializer."""
        if not self.request.user.is_staff:
            return BranchPublicSerializer
        return BranchSerializer

    def get_permissions(self):
        """Set permissions based on action."""
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]


class LegalPageViewSet(viewsets.ModelViewSet):
    """ViewSet for legal page management."""

    serializer_class = LegalPageSerializer
    pagination_class = StandardPagination
    lookup_field = 'type'

    def get_queryset(self):
        """Return legal pages based on user role."""
        if self.request.user.is_staff:
            return LegalPage.objects.all()
        return LegalPage.objects.filter(is_active=True)

    def get_serializer_class(self):
        """Return appropriate serializer."""
        if not self.request.user.is_staff:
            return LegalPagePublicSerializer
        return LegalPageSerializer

    def get_permissions(self):
        """Set permissions based on action."""
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    @action(detail=False, methods=['get'], url_path='by-type/(?P<page_type>[^/.]+)')
    def by_type(self, request, page_type=None):
        """Get active legal page by type."""
        try:
            page = LegalPage.objects.filter(
                type=page_type, is_active=True
            ).order_by('-effective_date').first()

            if not page:
                return Response(
                    {'error': _('Legal page not found.')},
                    status=status.HTTP_404_NOT_FOUND
                )

            serializer = LegalPagePublicSerializer(page, context={'request': request})
            return Response(serializer.data)
        except Exception:
            return Response(
                {'error': _('Invalid page type.')},
                status=status.HTTP_400_BAD_REQUEST
            )


class SiteConfigurationView(APIView):
    """
    Get/update site configuration.

    GET /api/v1/content/config/
    PUT /api/v1/admin/content/config/
    """

    def get_permissions(self):
        """Set permissions based on method."""
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def get(self, request):
        """Get site configuration."""
        config = SiteConfiguration.get_config()
        if request.user.is_staff:
            serializer = SiteConfigurationSerializer(config, context={'request': request})
        else:
            serializer = SiteConfigurationPublicSerializer(config, context={'request': request})
        return Response(serializer.data)

    def put(self, request):
        """Update site configuration (admin)."""
        config = SiteConfiguration.get_config()
        before_state = SiteConfigurationSerializer(config).data

        serializer = SiteConfigurationSerializer(
            config, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        AuditLog.log(
            entity=config,
            action=AuditLog.ACTION_UPDATED,
            actor=request.user,
            before_state=before_state,
            after_state=SiteConfigurationSerializer(config).data,
            request=request
        )

        return Response(SiteConfigurationSerializer(config).data)
