# Generated by Django 4.2.7 on 2024-02-26 11:27

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('video_call', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='account',
            name='dob',
            field=models.DateField(blank=True, null=True),
        ),
    ]
