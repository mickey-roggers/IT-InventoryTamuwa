from django.contrib.auth.models import User
from rest_framework import serializers

from assets.models import Department
from .models import UserProfile


class UserSerializer(serializers.ModelSerializer):
    profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "first_name", "last_name", "email", "is_active",
            "is_staff", "is_superuser", "profile",
        ]

    def get_profile(self, obj):
        profile = getattr(obj, "profile", None)
        if not profile:
            return None
        return {
            "id": profile.id,
            "role": profile.role,
            "department_id": profile.department_id,
            "department": profile.department.name if profile.department else None,
            "phone_number": profile.phone_number,
            "employee_id": profile.employee_id,
            "must_change_password": profile.must_change_password,
        }


class UserAdminSerializer(UserSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    role = serializers.ChoiceField(
        choices=UserProfile.ROLE_CHOICES, write_only=True, required=False
    )
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), write_only=True, required=False, allow_null=True
    )
    phone_number = serializers.CharField(write_only=True, required=False, allow_blank=True)
    employee_id = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + [
            "password", "role", "department_id", "phone_number", "employee_id",
        ]
        read_only_fields = ["is_superuser"]

    def validate(self, attrs):
        if not self.instance and not attrs.get("password"):
            raise serializers.ValidationError({"password": "A temporary password is required."})
        return attrs

    def validate_employee_id(self, value):
        value = value or None
        if value:
            qs = UserProfile.objects.filter(employee_id=value)
            if self.instance:
                qs = qs.exclude(user=self.instance)
            if qs.exists():
                raise serializers.ValidationError("This employee ID is already in use.")
        return value

    @staticmethod
    def _profile_values(validated_data):
        values = {}
        for input_name, profile_name in (
            ("role", "role"),
            ("department_id", "department"),
            ("phone_number", "phone_number"),
            ("employee_id", "employee_id"),
        ):
            if input_name in validated_data:
                values[profile_name] = validated_data.pop(input_name)
        return values

    def create(self, validated_data):
        profile_values = self._profile_values(validated_data)
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, **validated_data)
        profile = UserProfile.objects.create(
            user=user,
            role=profile_values.get("role") or "viewer",
            department=profile_values.get("department"),
            phone_number=profile_values.get("phone_number") or "",
            employee_id=profile_values.get("employee_id") or None,
            must_change_password=True,
        )
        profile.is_first_login = True
        profile.save(update_fields=["is_first_login"])
        return user

    def update(self, instance, validated_data):
        profile_values = self._profile_values(validated_data)
        password = validated_data.pop("password", None)
        instance = super().update(instance, validated_data)
        if password:
            instance.set_password(password)
            instance.save(update_fields=["password"])
        profile, _ = UserProfile.objects.get_or_create(user=instance)
        for field, value in profile_values.items():
            setattr(profile, field, value or None if field == "employee_id" else value)
        profile.save()
        return instance


class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source="user", write_only=True
    )

    class Meta:
        model = UserProfile
        fields = [
            "id",
            "user",
            "user_id",
            "role",
            "department",
            "phone_number",
            "employee_id",
            "profile_picture",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

