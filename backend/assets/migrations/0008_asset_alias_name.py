from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("assets", "0007_add_asset_link_history"),
    ]

    operations = [
        migrations.AddField(
            model_name="asset",
            name="alias_name",
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text="Internal name commonly used for this item.",
                max_length=100,
                verbose_name="Alias name",
            ),
        ),
    ]
