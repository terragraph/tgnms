# Generated by Django 2.1.1 on 2018-10-03 20:58

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='SingleHopTest',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.IntegerField(choices=[(1, 'Running'), (2, 'Finished'), (3, 'Aborted')], default=0)),
                ('origin_node', models.IntegerField(null=True)),
                ('peer_node', models.IntegerField(null=True)),
                ('link_name', models.CharField(max_length=256)),
                ('start_time', models.DateTimeField(null=True)),
                ('end_time', models.DateTimeField(null=True)),
                ('pathloss_avg', models.FloatField(null=True)),
                ('foliage_factor', models.FloatField(null=True)),
                ('health', models.IntegerField(null=True)),
                ('early_weak_factor', models.FloatField(null=True)),
                ('mcs_p90', models.IntegerField(null=True)),
                ('mcs_avg', models.FloatField(null=True)),
                ('rssi_avg', models.FloatField(null=True)),
                ('rssi_std', models.FloatField(null=True)),
                ('snr_avg', models.FloatField(null=True)),
                ('snr_std', models.FloatField(null=True)),
                ('txpwr_avg', models.FloatField(null=True)),
                ('txpwr_std', models.FloatField(null=True)),
                ('num_tx_packets', models.IntegerField(null=True)),
                ('num_rx_packets', models.IntegerField(null=True)),
                ('tx_per', models.FloatField(null=True)),
                ('rx_per', models.FloatField(null=True)),
                ('tx_ba', models.IntegerField(null=True)),
                ('rx_ba', models.IntegerField(null=True)),
                ('tx_ppdu', models.IntegerField(null=True)),
                ('rx_ppdu', models.IntegerField(null=True)),
                ('rx_plcp_fail', models.IntegerField(null=True)),
                ('rx_beam_idx', models.IntegerField(null=True)),
                ('rx_rtcal_top_panel_beam', models.IntegerField(null=True)),
                ('rx_rtcal_bot_panel_beam', models.IntegerField(null=True)),
                ('rx_vbs_beam', models.IntegerField(null=True)),
                ('rx_cbf_beam', models.IntegerField(null=True)),
                ('tx_beam_idx', models.IntegerField(null=True)),
                ('tx_rtcal_top_panel_beam', models.IntegerField(null=True)),
                ('tx_rtcal_bot_panel_beam', models.IntegerField(null=True)),
                ('tx_vbs_beam', models.IntegerField(null=True)),
                ('tx_cbf_beam', models.IntegerField(null=True)),
                ('link_up_time', models.IntegerField(null=True)),
                ('link_available_time', models.IntegerField(null=True)),
                ('num_link_up_flaps', models.IntegerField(null=True)),
                ('num_link_avail_flaps', models.IntegerField(null=True)),
                ('p2mp_flag', models.BooleanField(default=True)),
                ('ping_avg_latency', models.FloatField(null=True)),
                ('ping_loss', models.IntegerField(null=True)),
                ('ping_max_latency', models.FloatField(null=True)),
                ('ping_min_latency', models.FloatField(null=True)),
                ('ping_pkt_rx', models.IntegerField(null=True)),
                ('ping_pkt_tx', models.IntegerField(null=True)),
                ('iperf_throughput_min', models.FloatField(null=True)),
                ('iperf_throughput_max', models.FloatField(null=True)),
                ('iperf_throughput_mean', models.FloatField(null=True)),
                ('iperf_throughput_std', models.FloatField(null=True)),
                ('iperf_link_error_min', models.FloatField(null=True)),
                ('iperf_link_error_max', models.FloatField(null=True)),
                ('iperf_link_error_mean', models.FloatField(null=True)),
                ('iperf_link_error_std', models.FloatField(null=True)),
                ('iperf_jitter_min', models.FloatField(null=True)),
                ('iperf_jitter_max', models.FloatField(null=True)),
                ('iperf_jitter_mean', models.FloatField(null=True)),
                ('iperf_jitter_std', models.FloatField(null=True)),
                ('iperf_lost_datagram_min', models.FloatField(null=True)),
                ('iperf_lost_datagram_max', models.FloatField(null=True)),
                ('iperf_lost_datagram_mean', models.FloatField(null=True)),
                ('iperf_lost_datagram_std', models.FloatField(null=True)),
                ('iperf_udp_flag', models.BooleanField(default=True)),
                ('iperf_p90_tput', models.FloatField(null=True)),
            ],
        ),
        migrations.CreateModel(
            name='TestRunExecution',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('start_date', models.DateTimeField(default=django.utils.timezone.now)),
                ('end_date', models.DateTimeField(null=True)),
                ('status', models.IntegerField(choices=[(1, 'Running'), (2, 'Finished'), (3, 'Aborted')], default=0)),
                ('test_code', models.CharField(blank=True, max_length=120, null=True)),
                ('user', models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Test Run Execution',
                'verbose_name_plural': 'Test Runs Executions',
            },
        ),
        migrations.AddField(
            model_name='singlehoptest',
            name='test_run_execution',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to='api.TestRunExecution'),
        ),
    ]
