# Generated by Django 2.1.1 on 2019-03-19 19:21

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0013_auto_20190312_2308'),
    ]

    operations = [
        migrations.AddField(
            model_name='testrunexecution',
            name='multi_hop_parallel_sessions',
            field=models.IntegerField(null=True),
        ),
        migrations.AddField(
            model_name='testrunexecution',
            name='multi_hop_session_iteration_count',
            field=models.IntegerField(null=True),
        ),
        migrations.AddField(
            model_name='testrunexecution',
            name='protocol',
            field=models.CharField(max_length=256, null=True),
        ),
        migrations.AddField(
            model_name='testrunexecution',
            name='session_duration',
            field=models.IntegerField(null=True),
        ),
        migrations.AddField(
            model_name='testrunexecution',
            name='pop_to_node_link',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='testrunexecution',
            name='test_push_rate',
            field=models.IntegerField(null=True),
        ),
        migrations.AddField(
            model_name='testrunexecution',
            name='traffic_direction',
            field=models.IntegerField(null=True),
        ),
    ]
