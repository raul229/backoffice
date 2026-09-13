from django.db import migrations


def grant_delete_user(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")
    try:
        admin = Group.objects.get(name="Administrador")
        perm = Permission.objects.get(
            content_type__app_label="auth",
            codename="delete_user",
        )
    except (Group.DoesNotExist, Permission.DoesNotExist):
        return
    admin.permissions.add(perm)


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0008_reseed_role_permissions"),
    ]

    operations = [
        migrations.RunPython(grant_delete_user, migrations.RunPython.noop),
    ]
