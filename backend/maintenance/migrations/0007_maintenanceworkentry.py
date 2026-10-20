import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("maintenance", "0006_maintenancelog_issue"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="MaintenanceWorkEntry",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("task", models.CharField(max_length=255, verbose_name="Task performed")),
                ("outcome", models.TextField(blank=True)),
                ("performed_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("maintenance_log", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="work_entries", to="maintenance.maintenancelog")),
                ("recorded_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="maintenance_work_entries", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-performed_at", "-id"]},
        ),
        migrations.AddIndex(
            model_name="maintenanceworkentry",
            index=models.Index(fields=["maintenance_log", "performed_at"], name="maintenance_mainten_071a51_idx"),
        ),
    ]
