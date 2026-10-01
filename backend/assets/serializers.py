from django.contrib.auth.models import User
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
    requisition_item_id = serializers.IntegerField(write_only=True, required=False)
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

    class Meta:
        model = AssignmentHistory
        fields = [
            "id",
            "asset",
            "person",
            "person_id",
            "department",
            "start_date",
            "end_date",
            "notes",
            "created_at",
        ]
        read_only_fields = ["created_at"]


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
