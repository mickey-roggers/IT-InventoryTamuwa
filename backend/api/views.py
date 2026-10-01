"""
Centralized API Views for the Inventory System.

This module aggregates all API endpoints from various apps into a single location,
making it easy for external applications to integrate with the system.

To add a new API endpoint:
1. Create your viewset in the appropriate app's api.py
2. Import and re-export it here
3. Register it in api/urls.py
"""

from rest_framework import permissions, viewsets, filters, serializers, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth import password_validation
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta

# Assets API
from assets.models import (
    Asset,
    Category,
    StatusOption,
    Department,
    AssignmentHistory,
    ActivityLog,
    AssetLink,
    AssetLinkHistory,
)
from assets.utils import export_assets_excel
from assets.linking import create_bidirectional_link, synchronize_healthy_chain
from assets.serializers import (
    AssetSerializer,
    CategorySerializer,
    StatusOptionSerializer,
    DepartmentSerializer,
    AssignmentHistorySerializer,
    ActivityLogSerializer,
)

# Users API
from django.contrib.auth.models import User
from users.models import UserProfile
from users.serializers import UserSerializer, UserAdminSerializer, UserProfileSerializer

# Maintenance API
from maintenance.models import MaintenanceLog, ActionTakenOption
from maintenance.serializers import MaintenanceLogSerializer, ActionTakenOptionSerializer

# Technicians API
from technicians.models import (
    Technician,
    TechnicianAssistant,
    TechnicianService,
    TechnicianRecommendation,
)
from technicians.serializers import (
    TechnicianSerializer,
    TechnicianAssistantSerializer,
    TechnicianServiceSerializer,
    TechnicianRecommendationSerializer,
)


# ============================================================================
# PERMISSION CLASSES
# ============================================================================

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Read-only for authenticated users, write for staff/superuser.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        role = getattr(getattr(request.user, 'profile', None), 'role', '')
        return request.user.is_staff or request.user.is_superuser or role in ('admin', 'super_admin')


class IsStaffUser(permissions.BasePermission):
    def has_permission(self, request, view):
        role = getattr(getattr(request.user, 'profile', None), 'role', '')
        return bool(
            request.user and request.user.is_authenticated and
            (request.user.is_staff or request.user.is_superuser or role in ('admin', 'super_admin'))
        )


def is_admin_user(user):
    role = getattr(getattr(user, "profile", None), "role", "")
    return bool(user and user.is_authenticated and (
        user.is_staff or user.is_superuser or role in ("admin", "super_admin")
    ))


# ============================================================================
# ASSETS API VIEWSETS
# ============================================================================

class CategoryViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing asset categories.
    
    list: Get all categories
    create: Create a new category (admin only)
    retrieve: Get a specific category
    update: Update a category (admin only)
    destroy: Delete a category (admin only)
    """
    queryset = Category.objects.all().order_by("name")
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]


class StatusOptionViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing asset status options.
    
    list: Get all status options
    create: Create a new status option (admin only)
    retrieve: Get a specific status option
    update: Update a status option (admin only)
    destroy: Delete a status option (admin only)
    """
    queryset = StatusOption.objects.all().order_by("name")
    serializer_class = StatusOptionSerializer
    permission_classes = [IsAdminOrReadOnly]


class DepartmentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing departments.
    
    list: Get all departments
    create: Create a new department (admin only)
    retrieve: Get a specific department
    update: Update a department (admin only)
    destroy: Delete a department (admin only)
    """
    queryset = Department.objects.all().order_by("name")
    serializer_class = DepartmentSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "description"]

    @transaction.atomic
    def perform_destroy(self, instance):
        available = StatusOption.objects.filter(name="Available").first()
        for asset in Asset.objects.filter(department=instance, is_deleted=False):
            AssignmentHistory.objects.filter(asset=asset, department=instance, end_date__isnull=True).update(end_date=timezone.now())
            asset.department = None
            if not asset.assigned_to and available:
                asset.status = available
            asset.save()
        instance.delete()


class AssetViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing assets.
    
    list: Get all assets (supports filtering by category, status, assigned)
    create: Create a new asset
    retrieve: Get a specific asset
    update: Update an asset
    partial_update: Partially update an asset
    destroy: Soft delete an asset
    
    Query Parameters:
        - category: Filter by category ID
        - status: Filter by status ID
        - assigned: Filter by assignment status ('assigned' or 'unassigned')
        - search: Search by asset_id, serial_number, model_description, or assigned user
    """
    serializer_class = AssetSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "alias_name",
        "asset_id",
        "serial_number",
        "model_description",
        "assigned_to__first_name",
        "assigned_to__last_name",
        "purchased_from",
    ]
    ordering_fields = ["alias_name", "asset_id", "category__name", "model_description", "purchase_cost", "purchase_date", "status__name", "purchased_from", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = (
            Asset.objects.filter(is_deleted=False)
            .select_related(
                "category", "status", "assigned_to", "department", "last_known_person"
            )
            .all()
        )

        category_id = self.request.query_params.get("category")
        if category_id:
            qs = qs.filter(category_id=category_id)

        status_id = self.request.query_params.get("status")
        if status_id:
            qs = qs.filter(status_id=status_id)

        assigned = self.request.query_params.get("assigned")
        if assigned == "assigned":
            qs = qs.exclude(assigned_to__isnull=True)
        elif assigned == "unassigned":
            qs = qs.filter(assigned_to__isnull=True)

        person_id = self.request.query_params.get("person")
        if person_id:
            qs = qs.filter(assigned_to_id=person_id)

        department_id = self.request.query_params.get("department")
        if department_id:
            qs = qs.filter(department_id=department_id)

        return qs

    def perform_create(self, serializer):
        requisition_item_id = serializer.validated_data.pop("requisition_item_id", None)
        requisition_item = None
        if requisition_item_id is not None:
            try:
                requisition_item = RequisitionItem.objects.select_related("requisition").get(pk=requisition_item_id)
            except RequisitionItem.DoesNotExist:
                raise ValidationError({"requisition_item_id": "Select a valid bought item."})
            if requisition_item.requisition.status != "Bought" or not requisition_item.is_approved or requisition_item.item_type != "Asset" or requisition_item.is_processed:
                raise ValidationError({"requisition_item_id": "This item is not available in the bought-items queue."})
            serializer.validated_data["requisition"] = requisition_item.requisition
        if not serializer.validated_data.get("asset_id"):
            category = serializer.validated_data["category"]
            if not category.short_code:
                raise ValidationError({"asset_id": "This category needs a short code before an asset ID can be generated."})
            prefix = f"{category.short_code}-"
            used = Asset.objects.filter(category=category, asset_id__startswith=prefix).values_list("asset_id", flat=True)
            numbers = []
            for value in used:
                try:
                    numbers.append(int(value.removeprefix(prefix)))
                except ValueError:
                    continue
            serializer.validated_data["asset_id"] = f"{prefix}{max(numbers, default=0) + 1:03d}"
        serializer.save(created_by=self.request.user, updated_by=self.request.user)
        if requisition_item:
            if requisition_item.quantity > 1:
                requisition_item.quantity -= 1
                requisition_item.save(update_fields=["quantity"])
            else:
                requisition_item.is_processed = True
                requisition_item.processed_at = timezone.now()
                requisition_item.processed_by = self.request.user
                requisition_item.save(update_fields=["is_processed", "processed_at", "processed_by"])

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.updated_by = self.request.user
        instance.save(update_fields=["is_deleted", "updated_by", "updated_at"])

    @action(detail=False, methods=["get"], url_path="next-id")
    def next_id(self, request):
        category_id = request.query_params.get("category_id")
        try:
            category = Category.objects.get(pk=category_id)
        except (Category.DoesNotExist, TypeError, ValueError):
            return Response({"category_id": ["Select a valid category."]}, status=status.HTTP_400_BAD_REQUEST)
        if not category.short_code:
            return Response({"asset_id": ""})
        prefix = f"{category.short_code}-"
        numbers = []
        for value in Asset.objects.filter(category=category, asset_id__startswith=prefix).values_list("asset_id", flat=True):
            try:
                numbers.append(int(value.removeprefix(prefix)))
            except ValueError:
                continue
        return Response({"asset_id": f"{prefix}{max(numbers, default=0) + 1:03d}"})

    @action(detail=False, methods=["get"], url_path="export")
    def export(self, request):
        return export_assets_excel(self.filter_queryset(self.get_queryset()))


class AssignmentHistoryViewSet(viewsets.ModelViewSet):
    """
    API endpoint for viewing assignment history.
    
    list: Get all assignment history entries
    retrieve: Get a specific assignment history entry
    """
    queryset = (
        AssignmentHistory.objects.select_related("asset", "person", "department")
        .all()
        .order_by("-start_date")
    )
    serializer_class = AssignmentHistorySerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "delete", "head", "options"]

    def get_permissions(self):
        if self.action == "destroy":
            return [IsStaffUser()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        for field in ("asset", "person", "department"):
            value = self.request.query_params.get(field)
            if value:
                qs = qs.filter(**{f"{field}_id": value})
        return qs


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing activity logs.
    
    list: Get all activity logs
    retrieve: Get a specific activity log
    """
    queryset = (
        ActivityLog.objects.select_related("asset", "user")
        .all()
        .order_by("-timestamp")
    )
    serializer_class = ActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        asset = self.request.query_params.get("asset")
        return qs.filter(asset_id=asset) if asset else qs


# ============================================================================
# USERS API VIEWSETS
# ============================================================================

class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint for viewing users.
    
    list: Get all users
    retrieve: Get a specific user
    """
    queryset = User.objects.select_related("profile", "profile__department").all().order_by("username")
    serializer_class = UserAdminSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["username", "first_name", "last_name", "email", "profile__employee_id"]

    def get_permissions(self):
        if self.action == 'list':
            return [permissions.IsAuthenticated()]
        return [IsStaffUser()]

    def get_queryset(self):
        qs = super().get_queryset()
        role = self.request.query_params.get("role")
        return qs.filter(profile__role=role) if role else qs

    def perform_update(self, serializer):
        if serializer.instance.is_superuser and not self.request.user.is_superuser:
            raise PermissionDenied("Only a superuser can edit another superuser.")
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        target = self.get_object()
        if target == request.user:
            return Response({"detail": "You cannot delete your own account."}, status=status.HTTP_400_BAD_REQUEST)
        if target.is_superuser and not request.user.is_superuser:
            raise PermissionDenied("Only a superuser can delete another superuser.")
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="toggle-active")
    def toggle_active(self, request, pk=None):
        user = self.get_object()
        if user == request.user:
            return Response({"detail": "You cannot deactivate your own account."}, status=status.HTTP_400_BAD_REQUEST)
        if user.is_superuser and not request.user.is_superuser:
            raise PermissionDenied("Only a superuser can modify another superuser.")
        user.is_active = not user.is_active
        user.save(update_fields=["is_active"])
        return Response(self.get_serializer(user).data)

    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, pk=None):
        user = self.get_object()
        if user.is_superuser and not request.user.is_superuser:
            raise PermissionDenied("Only a superuser can reset another superuser.")
        new_password = request.data.get("password")
        if new_password:
            try:
                password_validation.validate_password(new_password, user)
            except Exception as exc:
                messages = getattr(exc, "messages", [str(exc)])
                return Response({"password": messages}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(new_password)
            user.save(update_fields=["password"])
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.must_change_password = True
        profile.save(update_fields=["must_change_password"])
        return Response({"detail": "The user must change their password at next sign-in."})


class UserProfileViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing user profiles.
    
    list: Get all user profiles
    create: Create a new user profile
    retrieve: Get a specific user profile
    update: Update a user profile
    partial_update: Partially update a user profile
    destroy: Delete a user profile
    """
    queryset = UserProfile.objects.select_related("user", "department").all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsStaffUser]


# ============================================================================
# MAINTENANCE API VIEWSETS
# ============================================================================

class ActionTakenOptionViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing maintenance action options.
    
    list: Get all action taken options
    create: Create a new action taken option
    retrieve: Get a specific action taken option
    update: Update an action taken option
    destroy: Delete an action taken option
    """
    queryset = ActionTakenOption.objects.all().order_by("name")
    serializer_class = ActionTakenOptionSerializer
    permission_classes = [IsAdminOrReadOnly]


class MaintenanceLogViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing maintenance logs.
    
    list: Get all maintenance logs
    create: Create a new maintenance log
    retrieve: Get a specific maintenance log
    update: Update a maintenance log
    partial_update: Partially update a maintenance log
    destroy: Delete a maintenance log
    """
    queryset = (
        MaintenanceLog.objects.select_related("asset", "action_taken", "performed_by")
        .all()
        .order_by("-timestamp")
    )
    serializer_class = MaintenanceLogSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["asset__alias_name", "asset__asset_id", "description", "notes", "performed_by__technician_name"]
    ordering_fields = ["timestamp", "date_reported", "date_completed", "cost_of_repair", "maintenance_status"]

    def get_queryset(self):
        qs = super().get_queryset()
        maintenance_status = self.request.query_params.get("status")
        performed_by = self.request.query_params.get("performed_by")
        asset = self.request.query_params.get("asset")
        if maintenance_status:
            qs = qs.filter(maintenance_status=maintenance_status)
        if performed_by:
            qs = qs.filter(performed_by_id=performed_by)
        if asset:
            qs = qs.filter(asset_id=asset)
        return qs

    def perform_create(self, serializer):
        values = {"reported_by": self.request.user}
        if serializer.validated_data.get("maintenance_status") == "Closed":
            values["completed_by"] = self.request.user
            values["date_completed"] = serializer.validated_data.get("date_completed") or timezone.now().date()
        log = serializer.save(**values)
        self._restore_closed_asset(log)

    def perform_update(self, serializer):
        if serializer.instance.maintenance_status == "Closed":
            raise ValidationError({"detail": "Closed maintenance logs cannot be edited."})
        values = {}
        if serializer.validated_data.get("maintenance_status") == "Closed":
            values["completed_by"] = self.request.user
            values["date_completed"] = serializer.validated_data.get("date_completed") or timezone.now().date()
        log = serializer.save(**values)
        self._restore_closed_asset(log)

    @staticmethod
    def _restore_closed_asset(log):
        if log.maintenance_status != "Closed":
            return
        status_name = "In Use" if log.asset.assigned_to or log.asset.department else "Available"
        asset_status = StatusOption.objects.filter(name=status_name).first()
        if asset_status:
            Asset.objects.filter(pk=log.asset_id).update(status=asset_status)


class TechnicianViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing technicians.
    
    list: Get all technicians
    create: Create a new technician
    retrieve: Get a specific technician
    update: Update a technician
    partial_update: Partially update a technician
    destroy: Delete a technician
    """
    queryset = Technician.objects.prefetch_related("assistants", "services").filter(is_active=True).order_by("company_name", "technician_name")
    serializer_class = TechnicianSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ["company_name", "technician_name", "email", "phone_number", "specialization"]

    def get_queryset(self):
        qs = Technician.objects.prefetch_related("assistants", "services").order_by("company_name", "technician_name")
        return qs.filter(is_active=True) if self.action == "list" else qs


class TechnicianAssistantViewSet(viewsets.ModelViewSet):
    queryset = TechnicianAssistant.objects.select_related("technician").all()
    serializer_class = TechnicianAssistantSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        technician = self.request.query_params.get("technician")
        return qs.filter(technician_id=technician) if technician else qs


class TechnicianServiceViewSet(viewsets.ModelViewSet):
    queryset = TechnicianService.objects.select_related("technician").all()
    serializer_class = TechnicianServiceSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        technician = self.request.query_params.get("technician")
        return qs.filter(technician_id=technician) if technician else qs


class TechnicianRecommendationViewSet(viewsets.ModelViewSet):
    queryset = TechnicianRecommendation.objects.select_related("technician").all()
    serializer_class = TechnicianRecommendationSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        technician = self.request.query_params.get("technician")
        if technician:
            qs = qs.filter(technician_id=technician)
        completion = self.request.query_params.get("status")
        if completion == "pending":
            qs = qs.filter(is_completed=False)
        elif completion == "completed":
            qs = qs.filter(is_completed=True)
        return qs


# ============================================================================
# DASHBOARD API
# ============================================================================

class DashboardStatsView(APIView):
    """
    API endpoint for dashboard statistics.
    
    get: Returns dashboard statistics including:
        - total_assets: Total number of assets
        - status_counts: Count of assets by status
        - assets_this_month: Assets added this month
        - maintenance_today: Maintenance logs for today
        - categories: Asset distribution by category
        - recent_activity: Recent activity logs
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        assets = Asset.objects.filter(is_deleted=False)

        # Status counts
        status_counts = {}
        status_options = StatusOption.objects.filter(is_active=True)
        for status in status_options:
            status_counts[status.name] = assets.filter(status=status).count()

        total_assets = assets.count()

        this_month_start = timezone.now().replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
        assets_this_month = assets.filter(created_at__gte=this_month_start).count()

        maintenance_today = MaintenanceLog.objects.filter(
            maintenance_status="Open",
            date_reported=timezone.now().date(),
        ).count()

        bought_items = RequisitionItem.objects.filter(
            requisition__status="Bought", is_approved=True
        )
        total_items_bought = bought_items.count()
        total_value_bought = sum((item.total_price for item in bought_items), 0)

        category_distribution = Category.objects.annotate(
            asset_count=Count("assets", filter=Q(assets__is_deleted=False))
        ).values("name", "asset_count")

        recent_activities = (
            ActivityLog.objects.select_related("asset", "user")
            .order_by("-timestamp")[:10]
        )

        recent_data = [
            {
                "asset_id": a.asset.asset_id if a.asset else None,
                "asset_alias_name": a.asset.alias_name if a.asset else None,
                "action": a.action,
                "description": a.description,
                "user": a.user.username if a.user else None,
                "timestamp": a.timestamp,
            }
            for a in recent_activities
        ]

        data = {
            "total_assets": total_assets,
            "status_counts": status_counts,
            "assets_this_month": assets_this_month,
            "maintenance_today": maintenance_today,
            "total_items_bought": total_items_bought,
            "total_value_bought": total_value_bought,
            "categories": list(category_distribution),
            "recent_activity": recent_data,
        }

        return Response(data)


class AssetQuantitiesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        categories = Category.objects.annotate(
            total=Count("assets", filter=Q(assets__is_deleted=False)),
            available=Count("assets", filter=Q(assets__is_deleted=False, assets__status__name__iexact="Available")),
            in_use=Count("assets", filter=Q(assets__is_deleted=False, assets__status__name__iexact="In Use")),
            maintenance=Count("assets", filter=Q(assets__is_deleted=False, assets__status__name__icontains="Maintenance")),
            missing=Count("assets", filter=Q(assets__is_deleted=False, assets__status__name__iexact="Missing")),
            retired=Count("assets", filter=Q(assets__is_deleted=False, assets__status__name__iexact="Retired")),
        ).order_by("name")
        return Response([
            {
                "id": category.id,
                "name": category.name,
                "total": category.total,
                "available": category.available,
                "in_use": category.in_use,
                "maintenance": category.maintenance,
                "missing": category.missing,
                "retired": category.retired,
            }
            for category in categories
        ])


class SystemAlertsView(APIView):
    """Legacy notifications hub, exposed as structured API data."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = timezone.now().date()
        alerts = []

        def add(level, category, title, message, href, timestamp):
            alerts.append({
                "id": f"{category.lower()}-{len(alerts) + 1}",
                "level": level,
                "category": category,
                "title": title,
                "message": message,
                "href": href,
                "timestamp": timestamp,
            })

        for issue in Issue.objects.filter(priority__in=["Critical", "High"], status__in=["Open", "Monitoring"]).order_by("-created_at"):
            age = (today - issue.created_at.date()).days
            add("danger" if issue.priority == "Critical" else "warning", "Issues", f"{issue.priority} Issue: {issue.title}", f"Status: {issue.status} · Open for {age} day{'s' if age != 1 else ''}", f"/issues/{issue.pk}", issue.created_at)

        for req in Requisition.objects.filter(status="Pending", created_at__date__lte=today - timedelta(days=7)).order_by("created_at"):
            age = (today - req.created_at.date()).days
            add("warning", "Requisitions", f"Stale Requisition: {req.req_no} — {req.title}", f"Pending for {age} days · Company: {req.company}", f"/requisitions/{req.pk}", req.created_at)

        for req in Requisition.objects.filter(status="Bought").prefetch_related("items"):
            count = sum(1 for item in req.items.all() if item.is_approved and not item.is_processed)
            if count:
                add("info", "Requisitions", f"Bought Req has unprocessed items: {req.req_no}", f"{count} item(s) not yet added to assets · {req.title}", f"/requisitions/{req.pk}", req.updated_at)

        for log in MaintenanceLog.objects.filter(maintenance_status="Open", date_reported__lte=today - timedelta(days=14)).select_related("asset").order_by("date_reported"):
            age = (today - log.date_reported).days
            add("warning", "Maintenance", f"Long maintenance: {log.asset.asset_id} — {log.asset.model_description}", f"Under maintenance for {age} days · Reported: {log.date_reported:%d %b %Y}", f"/maintenance/{log.pk}", log.timestamp)

        for asset in Asset.objects.filter(is_deleted=False, status__name="Missing").select_related("category").order_by("-updated_at"):
            add("danger", "Assets", f"Missing Asset: {asset.asset_id} — {asset.model_description}", f"Category: {asset.category.name}", f"/assets/{asset.pk}", asset.updated_at)

        for project in Project.objects.filter(status="Pending", created_at__date__lte=today - timedelta(days=30)).order_by("created_at"):
            age = (today - project.created_at.date()).days
            add("info", "Projects", f"Stale Project: {project.title}", f"Pending for {age} days · Priority: {project.priority}", f"/projects/{project.pk}", project.created_at)

        severity = {"danger": 0, "warning": 1, "info": 2}
        alerts.sort(key=lambda item: (severity[item["level"]], -item["timestamp"].timestamp()))
        return Response({
            "count": len(alerts),
            "counts": {level: sum(1 for item in alerts if item["level"] == level) for level in severity},
            "results": alerts,
        })

# Current User View
class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @staticmethod
    def response_data(user, profile):
        return {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_active': user.is_active,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
            'profile': {
                'id': profile.id,
                'role': profile.role if profile else 'viewer',
                'department_id': profile.department_id,
                'department': profile.department.name if profile and profile.department else None,
                'phone_number': profile.phone_number if profile else '',
                'employee_id': profile.employee_id if profile else '',
                'must_change_password': profile.needs_password_change() if profile else False,
            } if profile else None,
        }

    def get(self, request):
        user = request.user
        profile = UserProfile.objects.select_related('department').filter(user=user).first()
        return Response(self.response_data(user, profile))

    def patch(self, request):
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)
        for field in ("first_name", "last_name", "email"):
            if field in request.data:
                setattr(user, field, request.data[field])
        user.save(update_fields=["first_name", "last_name", "email"])
        for field in ("phone_number", "employee_id"):
            if field in request.data:
                value = request.data[field]
                if field == "employee_id" and value and UserProfile.objects.filter(employee_id=value).exclude(user=user).exists():
                    return Response({"employee_id": ["This employee ID is already in use."]}, status=status.HTTP_400_BAD_REQUEST)
                setattr(profile, field, value or None if field == "employee_id" else value)
        if "department_id" in request.data:
            department_id = request.data["department_id"] or None
            if department_id and not Department.objects.filter(pk=department_id).exists():
                return Response({"department_id": ["Select a valid department."]}, status=status.HTTP_400_BAD_REQUEST)
            profile.department_id = department_id
        profile.save()
        profile.refresh_from_db()
        return Response(self.response_data(user, profile))


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        profile = UserProfile.objects.filter(user=user).first()
        forced = bool(profile and profile.needs_password_change())
        if not forced and not user.check_password(request.data.get("current_password", "")):
            return Response({"current_password": ["The current password is incorrect."]}, status=status.HTTP_400_BAD_REQUEST)
        new_password = request.data.get("new_password", "")
        try:
            password_validation.validate_password(new_password, user)
        except Exception as exc:
            return Response({"new_password": getattr(exc, "messages", [str(exc)])}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save(update_fields=["password"])
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.must_change_password = False
        profile.is_first_login = False
        profile.password_changed_at = timezone.now()
        profile.save(update_fields=["must_change_password", "is_first_login", "password_changed_at"])
        return Response({"detail": "Password changed successfully."})


# Person ViewSet
from assets.models import Person, AssetLink
from assets.serializers import PersonSerializer

class PersonViewSet(viewsets.ModelViewSet):
    queryset = Person.objects.all().select_related('department').order_by('first_name', 'last_name')
    serializer_class = PersonSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['first_name', 'last_name']

    def get_queryset(self):
        qs = super().get_queryset()
        department = self.request.query_params.get('department')
        return qs.filter(department_id=department) if department else qs

    @transaction.atomic
    def perform_destroy(self, instance):
        available = StatusOption.objects.filter(name="Available").first()
        for asset in Asset.objects.filter(assigned_to=instance, is_deleted=False):
            AssignmentHistory.objects.filter(asset=asset, end_date__isnull=True).update(end_date=timezone.now())
            asset.assigned_to = None
            if available:
                asset.status = available
            asset.save()
        instance.delete()


# Issues
from issues.models import Issue, IssueComment, Project, ProjectItem, ProjectComment
from rest_framework import serializers

class IssueSerializer(serializers.ModelSerializer):
    reported_by_username = serializers.CharField(source='reported_by.username', read_only=True, default=None)
    comments_count = serializers.IntegerField(source='comments.count', read_only=True)
    class Meta:
        model = Issue
        fields = '__all__'

class IssueCommentSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source='author.username', read_only=True, default=None)
    class Meta:
        model = IssueComment
        fields = '__all__'

class IssueViewSet(viewsets.ModelViewSet):
    queryset = Issue.objects.select_related('asset', 'department', 'reported_by').order_by('-created_at')
    serializer_class = IssueSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description']

    def perform_create(self, serializer):
        serializer.save(reported_by=self.request.user)

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get("priority"):
            qs = qs.filter(priority=self.request.query_params["priority"])
        if self.request.query_params.get("status"):
            qs = qs.filter(status=self.request.query_params["status"])
        return qs

    def perform_update(self, serializer):
        if serializer.instance.status == "Closed":
            raise ValidationError({"detail": "Closed issues cannot be edited."})
        serializer.save()

class IssueCommentViewSet(viewsets.ModelViewSet):
    queryset = IssueComment.objects.select_related('author').order_by('created_at')
    serializer_class = IssueCommentSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        issue_id = self.request.query_params.get('issue')
        if issue_id:
            qs = qs.filter(issue_id=issue_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


# Projects
class ProjectSerializer(serializers.ModelSerializer):
    reported_by_username = serializers.CharField(source='reported_by.username', read_only=True, default=None)
    comments_count = serializers.IntegerField(source='comments.count', read_only=True)
    category_availability = serializers.SerializerMethodField()
    class Meta:
        model = Project
        fields = '__all__'

    def validate(self, attrs):
        status_value = attrs.get("status", getattr(self.instance, "status", None))
        rejected_reason = attrs.get("rejected_reason", getattr(self.instance, "rejected_reason", ""))
        if status_value == "Rejected" and not rejected_reason:
            raise serializers.ValidationError({"rejected_reason": "A reason is required when rejecting a project."})
        return attrs

    def get_category_availability(self, obj):
        if getattr(self.context.get("view"), "action", None) != "retrieve":
            return []
        result = []
        for category in obj.categories.all():
            assets = Asset.objects.filter(category=category, is_deleted=False).select_related("status", "assigned_to", "department").order_by("status__name", "asset_id")
            result.append({
                "category": {"id": category.id, "name": category.name},
                "available_count": sum(1 for asset in assets if asset.status and asset.status.name == "Available"),
                "assets": [{
                    "id": asset.id,
                    "asset_id": asset.asset_id,
                    "alias_name": asset.alias_name,
                    "model_description": asset.model_description,
                    "status": asset.status.name if asset.status else "Unknown",
                    "assigned_to": asset.assigned_to.full_name if asset.assigned_to else None,
                    "department": asset.department.name if asset.department else None,
                } for asset in assets],
            })
        return result

class ProjectItemSerializer(serializers.ModelSerializer):
    total_price = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    class Meta:
        model = ProjectItem
        fields = '__all__'

class ProjectCommentSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source='author.username', read_only=True, default=None)
    class Meta:
        model = ProjectComment
        fields = '__all__'

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.select_related('reported_by').order_by('-created_at')
    serializer_class = ProjectSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'date', 'priority', 'status', 'title']

    def perform_create(self, serializer):
        serializer.save(reported_by=self.request.user)

    def get_queryset(self):
        qs = super().get_queryset().prefetch_related("categories")
        if self.request.query_params.get("priority"):
            qs = qs.filter(priority=self.request.query_params["priority"])
        if self.request.query_params.get("status"):
            qs = qs.filter(status=self.request.query_params["status"])
        return qs

    def perform_update(self, serializer):
        if serializer.instance.status == "Done":
            raise ValidationError({"detail": "Completed projects cannot be edited."})
        serializer.save()

class ProjectItemViewSet(viewsets.ModelViewSet):
    queryset = ProjectItem.objects.all()
    serializer_class = ProjectItemSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

class ProjectCommentViewSet(viewsets.ModelViewSet):
    queryset = ProjectComment.objects.select_related('author').order_by('created_at')
    serializer_class = ProjectCommentSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


# Requisitions
from requisition.models import Requisition, RequisitionItem

class RequisitionItemSerializer(serializers.ModelSerializer):
    total_price = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    class Meta:
        model = RequisitionItem
        fields = '__all__'
        extra_kwargs = {"requisition": {"required": False}}

class RequisitionSerializer(serializers.ModelSerializer):
    items = RequisitionItemSerializer(many=True, required=False)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, default=None)
    total_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    class Meta:
        model = Requisition
        fields = '__all__'

    def validate(self, attrs):
        issue = attrs.get("linked_issue")
        project = attrs.get("linked_project")
        if issue and issue.status == "Closed":
            raise serializers.ValidationError({"linked_issue": "Closed issues cannot be linked."})
        if project and project.status == "Done":
            raise serializers.ValidationError({"linked_project": "Completed projects cannot be linked."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        items = validated_data.pop("items", [])
        requisition = super().create(validated_data)
        for item in items:
            RequisitionItem.objects.create(requisition=requisition, **item)
        return requisition

    @transaction.atomic
    def update(self, instance, validated_data):
        items = validated_data.pop("items", None)
        instance = super().update(instance, validated_data)
        if items is not None:
            instance.items.all().delete()
            for item in items:
                RequisitionItem.objects.create(requisition=instance, **item)
        return instance

class RequisitionViewSet(viewsets.ModelViewSet):
    queryset = Requisition.objects.select_related('created_by', 'linked_issue', 'linked_project').prefetch_related('items').order_by('-created_at')
    serializer_class = RequisitionSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['req_no', 'title']
    ordering_fields = ['req_no', 'title', 'status', 'created_by__username', 'created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        requisition_status = self.request.query_params.get("status")
        return qs.filter(status=requisition_status) if requisition_status else qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.status == "Bought":
            raise ValidationError({"detail": "Bought requisitions are locked and can only be changed in Django admin."})
        serializer.save()

    def perform_destroy(self, instance):
        if instance.status == "Bought":
            raise ValidationError({"detail": "Bought requisitions are locked and can only be changed in Django admin."})
        instance.delete()

class RequisitionItemViewSet(viewsets.ModelViewSet):
    queryset = RequisitionItem.objects.all()
    serializer_class = RequisitionItemSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        req_id = self.request.query_params.get('requisition')
        if req_id:
            qs = qs.filter(requisition_id=req_id)
        is_approved = self.request.query_params.get('is_approved')
        if is_approved in ('true', 'false'):
            qs = qs.filter(is_approved=is_approved == 'true')
        if self.request.query_params.get('bought_queue') == 'true':
            qs = qs.filter(requisition__status='Bought', is_approved=True, item_type='Asset', is_processed=False)
        return qs

    def _ensure_unlocked(self, instance):
        if instance.requisition.status == "Bought":
            raise ValidationError({"detail": "Items on a Bought requisition are locked."})

    def perform_update(self, serializer):
        self._ensure_unlocked(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self._ensure_unlocked(instance)
        instance.delete()

    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        item = self.get_object()
        if not (request.user.is_staff or getattr(getattr(request.user, 'profile', None), 'role', '') in ('admin', 'super_admin')):
            return Response({'detail': 'Administrator access is required.'}, status=status.HTTP_403_FORBIDDEN)
        asset_id = request.data.get('asset_id')
        try:
            asset = Asset.objects.get(pk=asset_id, is_deleted=False)
        except (Asset.DoesNotExist, TypeError, ValueError):
            return Response({'asset_id': ['Select a valid asset.']}, status=status.HTTP_400_BAD_REQUEST)
        if item.item_type != 'Asset' or item.requisition.status != 'Bought' or not item.is_approved:
            return Response({'detail': 'This item is not eligible for the bought-items queue.'}, status=status.HTTP_400_BAD_REQUEST)
        asset.requisition = item.requisition
        asset.updated_by = request.user
        asset.save(update_fields=['requisition', 'updated_by', 'updated_at'])
        if item.quantity > 1:
            item.quantity -= 1
            item.save(update_fields=['quantity'])
        else:
            item.is_processed = True
            item.processed_at = timezone.now()
            item.processed_by = request.user
            item.save(update_fields=['is_processed', 'processed_at', 'processed_by'])
        return Response(self.get_serializer(item).data)


# Tasks
from tasks.models import Task

class TaskSerializer(serializers.ModelSerializer):
    assigned_to_username = serializers.CharField(source='assigned_to.username', read_only=True, default=None)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, default=None)
    is_overdue = serializers.BooleanField(read_only=True)
    class Meta:
        model = Task
        fields = '__all__'

class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.select_related('assigned_to', 'created_by').order_by('-created_at')
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get("status"):
            qs = qs.filter(status=self.request.query_params["status"])
        if self.request.query_params.get("priority"):
            qs = qs.filter(priority=self.request.query_params["priority"])
        return qs


# Notifications (uses dashboard Notification model)
from dashboard.models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')


# Asset Links
class AssetLinkSerializer(serializers.ModelSerializer):
    linked_asset = serializers.PrimaryKeyRelatedField(queryset=Asset.objects.filter(is_deleted=False), required=False)
    linked_asset_ids = serializers.PrimaryKeyRelatedField(queryset=Asset.objects.filter(is_deleted=False), many=True, write_only=True, required=False)
    asset_display = serializers.CharField(source='asset.asset_id', read_only=True)
    linked_asset_display = serializers.CharField(source='linked_asset.asset_id', read_only=True)
    asset_alias_name = serializers.CharField(source='asset.alias_name', read_only=True)
    linked_asset_alias_name = serializers.CharField(source='linked_asset.alias_name', read_only=True)
    class Meta:
        model = AssetLink
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at']
        validators = []

    def validate(self, attrs):
        targets = list(attrs.get("linked_asset_ids", []))
        if attrs.get("linked_asset"):
            targets.append(attrs["linked_asset"])
        if not targets:
            raise serializers.ValidationError({"linked_asset_ids": "Select at least one asset to link."})
        if attrs.get('asset') in targets:
            raise serializers.ValidationError({'linked_asset': 'An asset cannot be linked to itself.'})
        return attrs

class AssetLinkViewSet(viewsets.ModelViewSet):
    queryset = AssetLink.objects.select_related('asset', 'linked_asset').all()
    serializer_class = AssetLinkSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        asset_id = self.request.query_params.get('asset')
        return qs.filter(Q(asset_id=asset_id) | Q(linked_asset_id=asset_id)) if asset_id else qs

    @transaction.atomic
    def perform_create(self, serializer):
        asset = serializer.validated_data["asset"]
        targets = list(serializer.validated_data.pop("linked_asset_ids", []))
        if serializer.validated_data.get("linked_asset"):
            targets.append(serializer.validated_data["linked_asset"])
        notes = serializer.validated_data.get("notes", "")
        first = None
        seen = set()
        for linked_asset in targets:
            if linked_asset.pk in seen:
                continue
            seen.add(linked_asset.pk)
            forward, _ = create_bidirectional_link(
                asset,
                linked_asset,
                notes=notes,
                created_by=self.request.user,
            )
            if first is None:
                first = forward

        synchronize_healthy_chain(asset, updated_by=self.request.user)
        serializer.instance = first

    @transaction.atomic
    def perform_destroy(self, instance):
        reverse = AssetLink.objects.filter(asset=instance.linked_asset, linked_asset=instance.asset).first()
        linked_at = instance.created_at
        for source, target in ((instance.asset, instance.linked_asset), (instance.linked_asset, instance.asset)):
            AssetLinkHistory.objects.create(asset=source, linked_asset=target, notes=instance.notes, linked_at=linked_at, unlinked_by=self.request.user)
        if reverse:
            reverse.delete()
        instance.delete()


class AssetLinkHistorySerializer(serializers.ModelSerializer):
    asset_display = serializers.CharField(source="asset.asset_id", read_only=True)
    linked_asset_display = serializers.CharField(source="linked_asset.asset_id", read_only=True)
    asset_alias_name = serializers.CharField(source="asset.alias_name", read_only=True)
    linked_asset_alias_name = serializers.CharField(source="linked_asset.alias_name", read_only=True)
    unlinked_by_username = serializers.CharField(source="unlinked_by.username", read_only=True, default=None)

    class Meta:
        model = AssetLinkHistory
        fields = "__all__"


class AssetLinkHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AssetLinkHistorySerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = AssetLinkHistory.objects.select_related("asset", "linked_asset", "unlinked_by").order_by("-unlinked_at")

    def get_queryset(self):
        qs = super().get_queryset()
        asset = self.request.query_params.get("asset")
        if asset:
            qs = qs.filter(Q(asset_id=asset) | Q(linked_asset_id=asset))
        if self.request.query_params.get("recent") == "true":
            qs = qs.filter(unlinked_at__gte=timezone.now() - timedelta(days=30))
        return qs
