from django.contrib.auth.models import User
from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers

from .models import (
    Asset,
    Category,
    StatusOption,
    Department,
    Person,
    AssignmentHistory,
    ActivityLog,
)


class UserSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email"]


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["id", "name", "description", "created_at", "updated_at"]


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "short_code", "description", "created_at", "updated_at"]


class StatusOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = StatusOption
        fields = ["id", "name", "color", "is_active", "created_at"]


class PersonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Person
        fields = ["id", "first_name", "last_name", "full_name", "department"]


class AssetSerializer(serializers.ModelSerializer):
    asset_id = serializers.CharField(required=False, allow_blank=True)
    maintenance_description = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
    )
    requisition_item_id = serializers.IntegerField(write_only=True, required=False)
    sync_linked_ownership = serializers.BooleanField(
        write_only=True, required=False, default=False
    )
    linked_asset_count = serializers.SerializerMethodField()
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source="category", write_only=True
    )
    status = StatusOptionSerializer(read_only=True)
    status_id = serializers.PrimaryKeyRelatedField(
        queryset=StatusOption.objects.all(), source="status", write_only=True
    )
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source="department",
        write_only=True,
        allow_null=True,
        required=False,
    )
    assigned_to = PersonSerializer(read_only=True)
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        queryset=Person.objects.all(),
        source="assigned_to",
        write_only=True,
        allow_null=True,
        required=False,
    )
    last_known_person = PersonSerializer(read_only=True)
    last_known_person_id = serializers.PrimaryKeyRelatedField(
        queryset=Person.objects.all(),
        source="last_known_person",
        write_only=True,
        allow_null=True,
        required=False,
    )
    requisition_display = serializers.CharField(source="requisition.req_no", read_only=True)

    class Meta:
        model = Asset
        fields = [
            "id",
            "asset_id",
            "alias_name",
            "maintenance_description",
            "category",
            "category_id",
            "model_description",
            "serial_number",
            "purchase_date",
            "assigned_to",
            "assigned_to_id",
            "department",
            "department_id",
            "last_known_person",
            "last_known_person_id",
            "status",
            "status_id",
            "admin_comments",
            "purchased_from",
            "purchase_cost",
            "requisition",
            "requisition_display",
            "requisition_item_id",
            "sync_linked_ownership",
            "linked_asset_count",
            "is_deleted",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]
        # DRF's generated validator for the conditional model constraint expects
        # every condition field (including is_deleted) in PATCH payloads. Asset
        # uniqueness is validated below using the submitted values merged with
        # the current instance.
        validators = []

    def validate(self, attrs):
        instance = self.instance
        category = attrs.get(
            "category",
            instance.category if instance else None,
        )
        serial_number = attrs.get(
            "serial_number",
            instance.serial_number if instance else "",
        )
        is_deleted = attrs.get(
            "is_deleted",
            instance.is_deleted if instance else False,
        )
        status = attrs.get("status", instance.status if instance else None)
        entering_maintenance = bool(
            status
            and status.name == "Under Maintenance"
            and (not instance or not instance.status or instance.status.name != "Under Maintenance")
        )
        if entering_maintenance and not attrs.get("maintenance_description", "").strip():
            raise serializers.ValidationError({
                "maintenance_description": (
                    "Describe the issue when changing an asset to Under Maintenance."
                )
            })

        serial_number = (serial_number or "").strip()
        if (
            not is_deleted
            and category
            and serial_number
            and serial_number.lower() not in {"n/a", "generic"}
        ):
            duplicates = Asset.objects.filter(
                category=category,
                serial_number__iexact=serial_number,
                is_deleted=False,
            )
            if instance:
                duplicates = duplicates.exclude(pk=instance.pk)
            if duplicates.exists():
                raise serializers.ValidationError(
                    {
                        "serial_number": (
                            "An active asset in this category already has this "
                            "serial number. Use a unique serial number, or enter "
                            '"N/A" / "Generic" if the item has no unique identifier.'
                        )
                    }
                )

        return attrs

    def create(self, validated_data):
        validated_data.pop("sync_linked_ownership", None)
        maintenance_description = validated_data.pop("maintenance_description", "").strip()
        instance = Asset(**validated_data)
        if maintenance_description:
            instance._maintenance_description = maintenance_description
        instance.save()
        return instance

    def update(self, instance, validated_data):
        instance._sync_linked_ownership = validated_data.pop(
            "sync_linked_ownership", False
        )
        maintenance_description = validated_data.pop("maintenance_description", "").strip()
        if maintenance_description:
            instance._maintenance_description = maintenance_description
        return super().update(instance, validated_data)

    def get_linked_asset_count(self, obj):
        annotated = getattr(obj, "linked_asset_count_value", None)
        if annotated is not None:
            return annotated
        return obj.links_from.filter(linked_asset__is_deleted=False).count()

    def validate_purchase_date(self, value):
        if value and (value.year < 1900 or value.year > timezone.now().year + 1):
            raise serializers.ValidationError(
                f"Purchase date year must be between 1900 and {timezone.now().year + 1}."
            )
        return value


class AssignmentHistorySerializer(serializers.ModelSerializer):
    asset = serializers.SlugRelatedField(
        slug_field="asset_id", queryset=Asset.objects.all()
    )
    person = PersonSerializer(read_only=True)
    person_id = serializers.PrimaryKeyRelatedField(
        queryset=Person.objects.all(),
        source="person",
        write_only=True,
        allow_null=True,
        required=False,
    )
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source="department",
        write_only=True,
        allow_null=True,
        required=False,
    )

    class Meta:
        model = AssignmentHistory
        fields = [
            "id",
            "asset",
            "person",
            "person_id",
            "department",
            "department_id",
            "start_date",
            "end_date",
            "notes",
            "created_at",
        ]
        read_only_fields = ["created_at"]

    def validate(self, attrs):
        instance = self.instance
        asset = attrs.get("asset", instance.asset if instance else None)
        person = attrs.get("person", instance.person if instance else None)
        department = attrs.get("department", instance.department if instance else None)
        start = attrs.get("start_date", instance.start_date if instance else None)
        end = attrs.get("end_date", instance.end_date if instance else None)

        if not person and not department:
            raise serializers.ValidationError({
                "person_id": "Select a person or department for this assignment."
            })
        if start and end and end < start:
            raise serializers.ValidationError({
                "end_date": "The assignment end date cannot be before its start date."
            })

        if asset and start:
            overlaps = AssignmentHistory.objects.filter(asset=asset)
            if instance:
                overlaps = overlaps.exclude(pk=instance.pk)
            overlaps = overlaps.filter(Q(end_date__isnull=True) | Q(end_date__gte=start))
            if end:
                overlaps = overlaps.filter(start_date__lte=end)
            if overlaps.exists():
                raise serializers.ValidationError({
                    "start_date": "This period overlaps another assignment for the asset."
                })
        return attrs


class ActivityLogSerializer(serializers.ModelSerializer):
    asset = serializers.SlugRelatedField(
        slug_field="asset_id", read_only=True
    )
    asset_alias_name = serializers.CharField(source="asset.alias_name", read_only=True, default="")
    user = UserSummarySerializer(read_only=True)

    class Meta:
        model = ActivityLog
        fields = [
            "id",
            "asset",
            "asset_alias_name",
            "user",
            "action",
            "description",
            "old_value",
            "new_value",
            "timestamp",
            "ip_address",
        ]
        read_only_fields = fields
