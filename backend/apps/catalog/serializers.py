"""
Catalog Serializers for MCD-Agencia.

This module provides serializers for catalog operations:
    - Categories (with hierarchy)
    - Tags
    - Attributes and values
    - Catalog items (products/services)
    - Product variants
    - Images
"""

from rest_framework import serializers
from django.utils.translation import gettext_lazy as _

from .models import (
    Category,
    Tag,
    Attribute,
    AttributeValue,
    CatalogItem,
    ProductVariant,
    CatalogImage,
)


class TagSerializer(serializers.ModelSerializer):
    """Serializer for Tag model."""

    class Meta:
        model = Tag
        fields = ['id', 'name', 'slug', 'color']
        read_only_fields = ['id', 'slug']


class AttributeValueSerializer(serializers.ModelSerializer):
    """Serializer for AttributeValue model."""

    class Meta:
        model = AttributeValue
        fields = ['id', 'value', 'value_en', 'slug', 'color_code', 'position']
        read_only_fields = ['id', 'slug']


class AttributeSerializer(serializers.ModelSerializer):
    """Serializer for Attribute model with values."""

    values = AttributeValueSerializer(many=True, read_only=True)

    class Meta:
        model = Attribute
        fields = [
            'id', 'name', 'name_en', 'slug', 'type',
            'is_filterable', 'is_visible', 'values'
        ]
        read_only_fields = ['id', 'slug']


class CategoryTreeSerializer(serializers.ModelSerializer):
    """
    Serializer for Category with children (tree structure).

    Recursively serializes category hierarchy.
    """

    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            'id', 'name', 'name_en', 'slug', 'description',
            'description_en', 'image', 'is_active', 'position', 'children'
        ]
        read_only_fields = ['id', 'slug']

    def get_children(self, obj):
        """Get serialized children categories."""
        children = obj.get_children().filter(is_active=True)
        return CategoryTreeSerializer(children, many=True, context=self.context).data


class CategorySerializer(serializers.ModelSerializer):
    """Serializer for Category model (flat)."""

    parent_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source='parent',
        write_only=True,
        required=False,
        allow_null=True
    )
    breadcrumb = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            'id', 'name', 'name_en', 'slug', 'description', 'description_en',
            'image', 'parent_id', 'is_active', 'position', 'breadcrumb',
            'meta_title', 'meta_description'
        ]
        read_only_fields = ['id', 'slug', 'breadcrumb']

    def get_breadcrumb(self, obj):
        """Get category breadcrumb path."""
        ancestors = obj.get_ancestors(include_self=True)
        return [{'id': str(a.id), 'name': a.name, 'slug': a.slug} for a in ancestors]


class CatalogImageSerializer(serializers.ModelSerializer):
    """Serializer for CatalogImage model with automatic image optimization."""

    catalog_item_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = CatalogImage
        fields = ['id', 'catalog_item_id', 'image', 'alt_text', 'alt_text_en', 'is_primary', 'position']
        read_only_fields = ['id']

    def validate_image(self, value):
        """Validate and optimize the uploaded image."""
        from .image_utils import validate_image, optimize_image

        # Validate image
        is_valid, error = validate_image(value)
        if not is_valid:
            raise serializers.ValidationError(error)

        # Optimize image (resize, compress, convert to WebP)
        optimized_file, _ = optimize_image(
            value,
            max_size=(1200, 1200),
            quality=85,
            convert_to_webp=True
        )

        return optimized_file

    def create(self, validated_data):
        """Create image and set as primary if first image."""
        catalog_item_id = validated_data.pop('catalog_item_id', None)

        if catalog_item_id:
            validated_data['catalog_item_id'] = catalog_item_id

            # If this is the first image for the product, make it primary
            existing_images = CatalogImage.objects.filter(catalog_item_id=catalog_item_id).count()
            if existing_images == 0:
                validated_data['is_primary'] = True

        return super().create(validated_data)


class ProductVariantSerializer(serializers.ModelSerializer):
    """Serializer for ProductVariant model."""

    attribute_values = AttributeValueSerializer(many=True, read_only=True)
    attribute_value_ids = serializers.PrimaryKeyRelatedField(
        queryset=AttributeValue.objects.all(),
        source='attribute_values',
        many=True,
        write_only=True,
        required=False
    )
    images = CatalogImageSerializer(many=True, read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    is_out_of_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = ProductVariant
        fields = [
            'id', 'sku', 'name', 'attribute_values', 'attribute_value_ids',
            'price', 'compare_at_price', 'stock', 'low_stock_threshold',
            'weight', 'dimensions', 'barcode', 'is_active',
            'is_low_stock', 'is_out_of_stock', 'images'
        ]
        read_only_fields = ['id', 'name', 'is_low_stock', 'is_out_of_stock']


class CatalogItemListSerializer(serializers.ModelSerializer):
    """
    Serializer for CatalogItem in list views.

    Lightweight serializer for catalog listings.
    """

    category = CategorySerializer(read_only=True)
    primary_image = serializers.SerializerMethodField()
    price_range = serializers.SerializerMethodField()
    has_discount = serializers.BooleanField(read_only=True)
    discount_percentage = serializers.IntegerField(read_only=True)

    class Meta:
        model = CatalogItem
        fields = [
            'id', 'type', 'name', 'name_en', 'slug', 'short_description',
            'short_description_en', 'category', 'sale_mode', 'base_price',
            'compare_at_price', 'price_range', 'has_discount',
            'discount_percentage', 'primary_image', 'is_featured'
        ]
        read_only_fields = ['id', 'slug']

    def get_primary_image(self, obj):
        """Get primary image URL."""
        primary = obj.images.filter(is_primary=True).first()
        if primary:
            return CatalogImageSerializer(primary, context=self.context).data
        first_image = obj.images.first()
        if first_image:
            return CatalogImageSerializer(first_image, context=self.context).data
        return None

    def get_price_range(self, obj):
        """Get price range for items with variants."""
        min_price, max_price = obj.price_range
        return {
            'min': str(min_price) if min_price else None,
            'max': str(max_price) if max_price else None,
            'has_range': min_price != max_price if min_price and max_price else False
        }


class CatalogItemDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for CatalogItem detail views.

    Full serializer with all related data.
    """

    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source='category',
        write_only=True,
        required=False
    )
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=Tag.objects.all(),
        source='tags',
        many=True,
        write_only=True,
        required=False
    )
    variants = ProductVariantSerializer(many=True, read_only=True)
    images = CatalogImageSerializer(many=True, read_only=True)
    price_range = serializers.SerializerMethodField()
    has_discount = serializers.BooleanField(read_only=True)
    discount_percentage = serializers.IntegerField(read_only=True)
    total_stock = serializers.IntegerField(read_only=True)
    is_in_stock = serializers.BooleanField(read_only=True)
    available_attributes = serializers.SerializerMethodField()

    class Meta:
        model = CatalogItem
        fields = [
            'id', 'type', 'name', 'name_en', 'slug',
            'short_description', 'short_description_en',
            'description', 'description_en',
            'category', 'category_id', 'tags', 'tag_ids',
            'sale_mode', 'payment_mode',
            'base_price', 'compare_at_price',
            'deposit_percentage', 'deposit_amount',
            'price_range', 'has_discount', 'discount_percentage',
            'track_inventory', 'total_stock', 'is_in_stock',
            'is_active', 'is_featured',
            'specifications', 'installation_info', 'installation_info_en',
            'meta_title', 'meta_description', 'og_image',
            'variants', 'images', 'available_attributes',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'slug', 'price_range', 'has_discount', 'discount_percentage',
            'total_stock', 'is_in_stock', 'created_at', 'updated_at'
        ]

    def get_price_range(self, obj):
        """Get price range for items with variants."""
        min_price, max_price = obj.price_range
        return {
            'min': str(min_price) if min_price else None,
            'max': str(max_price) if max_price else None,
            'has_range': min_price != max_price if min_price and max_price else False
        }

    def get_available_attributes(self, obj):
        """Get available attributes from variants."""
        attributes = {}
        for variant in obj.variants.filter(is_active=True):
            for attr_value in variant.attribute_values.all():
                attr = attr_value.attribute
                if attr.id not in attributes:
                    attributes[attr.id] = {
                        'id': str(attr.id),
                        'name': attr.name,
                        'name_en': attr.name_en,
                        'type': attr.type,
                        'values': []
                    }
                value_data = {
                    'id': str(attr_value.id),
                    'value': attr_value.value,
                    'value_en': attr_value.value_en,
                    'color_code': attr_value.color_code
                }
                if value_data not in attributes[attr.id]['values']:
                    attributes[attr.id]['values'].append(value_data)
        return list(attributes.values())


class CatalogItemAdminSerializer(CatalogItemDetailSerializer):
    """
    Serializer for admin catalog management.

    Includes additional admin-only fields.
    """

    class Meta(CatalogItemDetailSerializer.Meta):
        fields = CatalogItemDetailSerializer.Meta.fields + [
            'external_system', 'external_id', 'last_sync_at', 'sync_status'
        ]
