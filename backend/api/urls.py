"""
Centralized API URL Configuration.

This module provides a single entry point for all API endpoints.
External applications can integrate with the system using these endpoints.

Base URL: /api/

Available Endpoints:
    - /api/assets/ - Asset management
    - /api/categories/ - Category management
    - /api/status-options/ - Status option management
    - /api/departments/ - Department management
    - /api/assignment-history/ - Assignment history (read-only)
    - /api/activity-logs/ - Activity logs (read-only)
    - /api/maintenance-logs/ - Maintenance log management
    - /api/action-taken-options/ - Action taken options
    - /api/technicians/ - Technician management
    - /api/users/ - User management (read-only)
    - /api/user-profiles/ - User profile management
    - /api/dashboard/ - Dashboard statistics
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

# Create a router and register our viewsets
router = DefaultRouter()

# Assets endpoints
router.register(r"assets", views.AssetViewSet, basename="asset")
router.register(r"categories", views.CategoryViewSet, basename="category")
router.register(r"status-options", views.StatusOptionViewSet, basename="status-option")
router.register(r"departments", views.DepartmentViewSet, basename="department")
router.register(r"assignment-history", views.AssignmentHistoryViewSet, basename="assignment-history")
router.register(r"activity-logs", views.ActivityLogViewSet, basename="activity-log")

# Users endpoints
router.register(r"users", views.UserViewSet, basename="user")
router.register(r"user-profiles", views.UserProfileViewSet, basename="user-profile")

# Maintenance endpoints
router.register(r"maintenance-logs", views.MaintenanceLogViewSet, basename="maintenance-log")
router.register(r"action-taken-options", views.ActionTakenOptionViewSet, basename="action-taken-option")

# Technicians endpoints
router.register(r"technicians", views.TechnicianViewSet, basename="technician")
router.register(r"technician-assistants", views.TechnicianAssistantViewSet, basename="technician-assistant")
router.register(r"technician-services", views.TechnicianServiceViewSet, basename="technician-service")
router.register(r"technician-recommendations", views.TechnicianRecommendationViewSet, basename="technician-recommendation")

# New Endpoints
router.register(r'people', views.PersonViewSet, basename='person')
router.register(r'issues', views.IssueViewSet, basename='issue')
router.register(r'issue-comments', views.IssueCommentViewSet, basename='issue-comment')
router.register(r'projects', views.ProjectViewSet, basename='project')
router.register(r'project-items', views.ProjectItemViewSet, basename='project-item')
router.register(r'project-comments', views.ProjectCommentViewSet, basename='project-comment')
router.register(r'requisitions', views.RequisitionViewSet, basename='requisition')
router.register(r'requisition-items', views.RequisitionItemViewSet, basename='requisition-item')
router.register(r'tasks', views.TaskViewSet, basename='task')
router.register(r'notifications', views.NotificationViewSet, basename='notification')
router.register(r'asset-links', views.AssetLinkViewSet, basename='asset-link')

# API URL patterns
urlpatterns = [
    path("", include(router.urls)),
    path("dashboard/", views.DashboardStatsView.as_view(), name="dashboard-stats"),
    path("asset-quantities/", views.AssetQuantitiesView.as_view(), name="asset-quantities"),
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', views.CurrentUserView.as_view(), name='current-user'),
    path('auth/change-password/', views.ChangePasswordView.as_view(), name='change-password'),
]
