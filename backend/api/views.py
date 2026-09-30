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
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth import password_validation
from django.db.models import Count, Q
from django.utils import timezone

# Assets API
from assets.models import (
    Asset,
    Category,
    StatusOption,
    Department,
    AssignmentHistory,
    ActivityLog,
)
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
        "asset_id",
        "serial_number",
        "model_description",
        "assigned_to__first_name",
        "assigned_to__last_name",
    ]
    ordering_fields = ["asset_id", "created_at", "purchase_date"]
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
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.updated_by = self.request.user
        instance.save(update_fields=["is_deleted", "updated_by", "updated_at"])


class AssignmentHistoryViewSet(viewsets.ReadOnlyModelViewSet):
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

    def destroy(self, request, *args, **kwargs):
        if self.get_object() == request.user:
            return Response({"detail": "You cannot delete your own account."}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="toggle-active")
    def toggle_active(self, request, pk=None):
        user = self.get_object()
        if user == request.user:
            return Response({"detail": "You cannot deactivate your own account."}, status=status.HTTP_400_BAD_REQUEST)
        user.is_active = not user.is_active
        user.save(update_fields=["is_active"])
        return Response(self.get_serializer(user).data)

    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, pk=None):
        user = self.get_object()
        new_password = request.data.get("password", "")
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
        return Response({"detail": "Password reset successfully."})


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
    permission_classes = [permissions.IsAuthenticated]


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
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["asset__asset_id", "description", "notes", "performed_by__technician_name"]

    def perform_create(self, serializer):
        serializer.save(reported_by=self.request.user)


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
    queryset = Technician.objects.prefetch_related("assistants", "services").all().order_by("company_name", "technician_name")
    serializer_class = TechnicianSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ["company_name", "technician_name", "email", "phone_number", "specialization"]


class TechnicianAssistantViewSet(viewsets.ModelViewSet):
    queryset = TechnicianAssistant.objects.select_related("technician").all()
    serializer_class = TechnicianAssistantSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        technician = self.request.query_params.get("technician")
        return qs.filter(technician_id=technician) if technician else qs


class TechnicianServiceViewSet(viewsets.ModelViewSet):
    queryset = TechnicianService.objects.select_related("technician").all()
    serializer_class = TechnicianServiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        technician = self.request.query_params.get("technician")
        return qs.filter(technician_id=technician) if technician else qs


class TechnicianRecommendationViewSet(viewsets.ModelViewSet):
    queryset = TechnicianRecommendation.objects.select_related("technician").all()
    serializer_class = TechnicianRecommendationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        technician = self.request.query_params.get("technician")
        return qs.filter(technician_id=technician) if technician else qs


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
        ).order_by("name")
        return Response([
            {
                "id": category.id,
                "name": category.name,
                "total": category.total,
                "available": category.available,
                "in_use": category.in_use,
                "maintenance": category.maintenance,
            }
            for category in categories
        ])

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
        if not user.check_password(request.data.get("current_password", "")):
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
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description']

    def perform_create(self, serializer):
        serializer.save(reported_by=self.request.user)

class IssueCommentViewSet(viewsets.ModelViewSet):
    queryset = IssueComment.objects.select_related('author').order_by('created_at')
    serializer_class = IssueCommentSerializer
    permission_classes = [permissions.IsAuthenticated]

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
    class Meta:
        model = Project
        fields = '__all__'

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
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'description']

    def perform_create(self, serializer):
        serializer.save(reported_by=self.request.user)

class ProjectItemViewSet(viewsets.ModelViewSet):
    queryset = ProjectItem.objects.all()
    serializer_class = ProjectItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

class ProjectCommentViewSet(viewsets.ModelViewSet):
    queryset = ProjectComment.objects.select_related('author').order_by('created_at')
    serializer_class = ProjectCommentSerializer
    permission_classes = [permissions.IsAuthenticated]

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

class RequisitionSerializer(serializers.ModelSerializer):
    items = RequisitionItemSerializer(many=True, read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, default=None)
    total_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    class Meta:
        model = Requisition
        fields = '__all__'

class RequisitionViewSet(viewsets.ModelViewSet):
    queryset = Requisition.objects.select_related('created_by', 'linked_issue', 'linked_project').prefetch_related('items').order_by('-created_at')
    serializer_class = RequisitionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['req_no', 'title']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class RequisitionItemViewSet(viewsets.ModelViewSet):
    queryset = RequisitionItem.objects.all()
    serializer_class = RequisitionItemSerializer
    permission_classes = [permissions.IsAuthenticated]

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
    asset_display = serializers.CharField(source='asset.asset_id', read_only=True)
    linked_asset_display = serializers.CharField(source='linked_asset.asset_id', read_only=True)
    class Meta:
        model = AssetLink
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at']

    def validate(self, attrs):
        if attrs.get('asset') == attrs.get('linked_asset'):
            raise serializers.ValidationError({'linked_asset': 'An asset cannot be linked to itself.'})
        return attrs

class AssetLinkViewSet(viewsets.ModelViewSet):
    queryset = AssetLink.objects.select_related('asset', 'linked_asset').all()
    serializer_class = AssetLinkSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        asset_id = self.request.query_params.get('asset')
        return qs.filter(Q(asset_id=asset_id) | Q(linked_asset_id=asset_id)) if asset_id else qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
