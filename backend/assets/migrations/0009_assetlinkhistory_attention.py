from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("assets", "0008_asset_alias_name"),
    ]

    operations = [
        migrations.AddField(
            model_name="assetlinkhistory",
            name="attention_required",
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AddField(
            model_name="assetlinkhistory",
            name="attention_resolved_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="assetlinkhistory",
            name="attention_resolution",
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
