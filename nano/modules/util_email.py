#!/usr/bin/env python3

import smtplib
import time
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from modules.addon_misc import epoch2readable
from modules.util_weather import get_public_weather_info


DEFAULT_EMAIL_LIST = ["fsun@fb.com"]

# SMTP config for dev_server
DEV_SERVER_FROM = "tg-self-test@fb.com"
DEV_SERVER_SMTP_HOST = ""
DEV_SERVER_SMTP_PORT = 0
DEV_SERVER_SMTP_USERNAME = None
DEV_SERVER_SMTP_PASSWORD = None
NETWORK_ANALYZER_INTRO_URL = "https://fb.quip.com/Of63AmHfhxbp"

# SMTP config for outside dev_server
FROM = "terragraph.selftest@gmail.com"
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USERNAME = "terragraph.selftest"
SMTP_PASSWORD = "terragraphselftest"


def send_email(
    dev_server, to_email_list=DEFAULT_EMAIL_LIST, cc_email_list="", subject="", body=""
):
    """
    send notification email
    """
    if not len("".join(to_email_list)):
        return False
    msg = MIMEMultipart("alternative")
    if isinstance(to_email_list, list):
        msg["To"] = ", ".join(to_email_list)
    elif isinstance(to_email_list, str):
        msg["To"] = to_email_list
    else:
        return False
    if isinstance(cc_email_list, list):
        msg["Cc"] = ", ".join(cc_email_list)
    elif isinstance(cc_email_list, str):
        msg["Cc"] = cc_email_list
    else:
        return False
    print("In send_email, sending test result email to: {}".format(msg["To"]))
    if subject:
        msg["Subject"] = subject
    else:
        msg["Subject"] = "[Self-Test] Email"
    if body:
        msg.attach(MIMEText(body, "html"))

    # config SMTP
    if dev_server:
        sender = DEV_SERVER_FROM
        host = DEV_SERVER_SMTP_HOST
        port = DEV_SERVER_SMTP_PORT
        smtp_username = DEV_SERVER_SMTP_USERNAME
        smtp_password = DEV_SERVER_SMTP_PASSWORD
    else:
        sender = FROM
        host = SMTP_HOST
        port = SMTP_PORT
        smtp_username = SMTP_USERNAME
        smtp_password = SMTP_PASSWORD

    # send through SMTP
    try:
        s = smtplib.SMTP(host=host, port=port)
        if smtp_username is None:
            s.connect()
            print("sender={}".format(sender) + ", smtp connection successful")
        else:
            s.ehlo()
            s.starttls()
            s.ehlo()
            s.login(smtp_username, smtp_password)
            print("sender={}".format(sender) + ", smtp login successful")
        s.sendmail(sender, to_email_list, msg.as_string())
        s.quit()
    except BaseException as ex:
        print(ex)
        return False
    return True


def email_results(args, email_list, content, cc_list=None, test_name=""):
    """
    send email to tell test results
    """
    if cc_list is None:
        cc_list = []
    if not content or not email_list:
        return

    # initialize params
    dev_server = args.get("run_location", "vm") == "devserver"
    analysis_time = args.get(
        "analysis_start_time_readable",
        time.strftime("%H:%M:%S, %a, %b %d, %Y ", time.localtime(int(time.time()))),
    )
    na_url = args.get("network_analyzer_url", "#")
    na_name = "Network Analyzer {0}".format(args.get("network_name", "").upper())

    # get public weather info
    weather = {}
    if args.get("public_weather", {}).get("enable", False):
        try:
            weather = get_public_weather_info(args)
            print("Obtained weather info for {0}".format(args.get("network_name", "")))
        except Exception as exp:
            weather = {}
            print(
                "Failed to obtain weather for {0}: {1}".format(
                    args.get("network_name", "")
                ),
                exp,
            )
    weather_info = ""
    if weather:
        weather_info = (
            "<div>At {0}, ".format(epoch2readable(int(weather["epoch"])))
            + "<b>temperature</b>: {0}F, ".format(weather["temperature"])
            + "<b>precip rate</b>: {0}in, ".format(weather["precip_rate"])
            + "<b>humidity</b>: {0}%, ".format(weather["humidity"])
            + "<b>wind speed</b>: {0}mph, ".format(weather["wind_speed"])
            + "</div>"
        )

    # send email
    send_email(
        dev_server=dev_server,
        to_email_list=email_list,
        cc_email_list=cc_list,
        subject="[{0}] {1}".format(args.get("name", ""), test_name),
        body=(
            "<html><head>"
            + DEFAULT_STYLE
            + "</head>"
            + '<body><div id="wrapper">'
            + "<div> For latest result visualization, "
            + " visit <a href={0}>{1}</a>.".format(na_url, na_name)
            + "</div><div>Analysis at {0}.</div>".format(analysis_time)
            + weather_info
            + content
            + '<div class="clear"></div>'
            + "</div></body></html>"
        ),
    )


DEFAULT_STYLE = """
<style type="text/css">
body, table{
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-weight: 300; font-size: 1.2rem;
}
body {
  line-height: 1.3rem; letter-spacing: 0.01rem;
  color: #333; background-color: #eee;
}
.clear {clear: both}
#wrapper {
  background-color: #fff;
  margin: 20px auto; max-width: 1096px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  -webkit-box-shadow: 0 1px 3px 0 rgba(0,0,0,.12),
                      0 1px 2px 0 rgba(0,0,0,.24);
  -moz-box-shadow:    0 1px 3px 0 rgba(0,0,0,.12),
                      0 1px 2px 0 rgba(0,0,0,.24);
  box-shadow:         0 1px 3px 0 rgba(0,0,0,.12),
                      0 1px 2px 0 rgba(0,0,0,.24);
}
#wrapper div {padding: 10px 15px}
table {
  width: 100%; max-width: 100%;
  margin: 10px 0; border: none; text-align: center
}
table td, table th {
  padding: 5px 2px; border-top: 5px solid #fff
}
table .same td { border: 0 }
.color_green {background-color: #E8F5E9}
.color_blue {background-color: #ADD8E6}
.color_yellow {background-color: #FFE0B2}
.color_purple {background-color: #D1C4E9}
.color_red {background-color: #FF9E80}
.color_black {background-color: #ECEFF1}
@media screen and (max-width: 768px) {
  table {
    padding: 3px 0; margin: 0; background-color: transparent;
    font-size: 1rem;
  }
  table .minimal {display: none}
}
.show_content{
    display: block;
}
.show_self{
    display: block;
    font-size: 100%;
}
.show_self:hover .show_content{
    display: block;
    font-size: 100%;
}
a:hover + div {
    display: block;
    font-size: 120%;
}
</style>
"""
