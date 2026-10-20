from django.contrib import admin
from .models import MaintenanceLog, MaintenanceWorkEntry, ActionTakenOption


class MaintenanceWorkEntryInline(admin.TabularInline):
    model = MaintenanceWorkEntry
    extra = 0
    readonly_fields = ["recorded_by", "created_at"]


@admin.register(ActionTakenOption)
class ActionTakenOptionAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name']


@admin.register(MaintenanceLog)
class MaintenanceLogAdmin(admin.ModelAdmin):
    list_display = [
        'asset', 'issue', 'date_reported', 'maintenance_status',
        'action_taken', 'cost_of_repair', 'date_completed'
    ]
    list_filter = ['maintenance_status', 'date_reported', 'action_taken']
    search_fields = ['asset__asset_id', 'issue__title', 'description']
    readonly_fields = ['timestamp', 'created_at', 'updated_at']
    fieldsets = (
        ('Asset Information', {
            'fields': ('asset', 'issue', 'previous_assigned_person')
        }),
        ('Maintenance Details', {
            'fields': (
                'date_reported', 'date_completed', 'description',
                'action_taken', 'cost_of_repair', 'maintenance_status'
            )
        }),
        ('Personnel', {
            'fields': ('reported_by', 'completed_by', 'performed_by')
        }),
        ('Procurement', {
            'fields': ('requisition',)
        }),
        ('Additional Notes', {
            'fields': ('notes',)
        }),
        ('Metadata', {
            'fields': ('timestamp', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    date_hierarchy = 'date_reported'
    inlines = [MaintenanceWorkEntryInline]


@admin.register(MaintenanceWorkEntry)
class MaintenanceWorkEntryAdmin(admin.ModelAdmin):
    list_display = ["maintenance_log", "task", "performed_at", "recorded_by"]
    list_filter = ["performed_at"]
    search_fields = ["maintenance_log__asset__asset_id", "task", "outcome"]
    readonly_fields = ["created_at"]
