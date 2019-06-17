# -*- coding: utf-8 -*-
# Generated by Django 1.11 on 2018-07-02 06:16
from __future__ import unicode_literals

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('annotator', '0022_auto_20180702_0805'),
    ]

    operations = [
        migrations.CreateModel(
            name='LabelLabelset',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('class_number', models.IntegerField(default=1)),
                ('label', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='annotator.Label')),
                ('labelset', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='annotator.Labelset')),
            ],
        ),
    ]