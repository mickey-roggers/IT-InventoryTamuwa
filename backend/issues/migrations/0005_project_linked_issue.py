import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("issues", "0004_remove_issue_requisition_remove_project_requisitions")]

    operations = [
        migrations.AddField(
            model_name="project",
            name="linked_issue",
            field=models.ForeignKey(blank=True, help_text="Optional issue that led to this project", null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="projects", to="issues.issue"),
        ),
    ]
