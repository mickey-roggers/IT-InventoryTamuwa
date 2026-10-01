from django.contrib.auth.models import User
from rest_framework import serializers

from .models import MaintenanceLog, ActionTakenOption
from assets.models import Asset, Person
from assets.serializers import PersonSerializer
from technicians.models import Technician


class ActionTakenOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActionTakenOption
        fields = ["id", "name", "description", "is_active", "created_at"]


class TechnicianSummarySerializer(serializers.ModelSerializer):
    """Summary serializer for Technician"""
    class Meta:
        model = Technician
        fields = ["id", "company_name", "technician_name"]


class MaintenanceLogSerializer(serializers.ModelSerializer):
    asset = serializers.SlugRelatedField(
        slug_field="asset_id", queryset=Asset.objects.all()
    )
    action_taken = ActionTakenOptionSerializer(read_only=True)
    action_taken_id = serializers.PrimaryKeyRelatedField(
        queryset=ActionTakenOption.objects.filter(is_active=True),
        source="action_taken",
        write_only=True,
        allow_null=True,
        required=False,
    )
    performed_by = TechnicianSummarySerializer(read_only=True)
    performed_by_id = serializers.PrimaryKeyRelatedField(
        queryset=Technician.objects.filter(is_active=True),
        source="performed_by",
        write_only=True,
        allow_null=True,
        required=False,
    )
    previous_assigned_person = PersonSerializer(read_only=True)
    previous_assigned_person_id = serializers.PrimaryKeyRelatedField(
        queryset=Person.objects.all(),
        source="previous_assigned_person",
        write_only=True,
        allow_null=True,
        required=False,
    )
    reported_by = serializers.SlugRelatedField(
        slug_field="username", read_only=True
    )
    reported_by_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_active=True),
        source="reported_by",
        write_only=True,
        allow_null=True,
        required=False,
    )
    completed_by = serializers.SlugRelatedField(
        slug_field="username", read_only=True
    )
    completed_by_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_active=True),
        source="completed_by",
        write_only=True,
        allow_null=True,
        required=False,
    )

    class Meta:
        model = MaintenanceLog
        fields = [
            "id",
            "asset",
            "timestamp",
            "date_reported",
            "date_completed",
            "description",
            "action_taken",
            "action_taken_id",
            "cost_of_repair",
            "maintenance_status",
            "performed_by",
            "performed_by_id",
            "previous_assigned_person",
            "previous_assigned_person_id",
            "reported_by",
            "reported_by_id",
            "completed_by",
            "completed_by_id",
            "notes",
            "requisition",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate(self, attrs):
        reported = attrs.get("date_reported", getattr(self.instance, "date_reported", None))
        completed = attrs.get("date_completed", getattr(self.instance, "date_completed", None))
        if reported and completed and completed < reported:
            raise serializers.ValidationError({
                "date_completed": "Date completed cannot be before date reported."
            })
        return attrs

