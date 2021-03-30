FROM python:3.7-slim
RUN pip install kopf && pip install kubernetes && pip install jinja2

WORKDIR /usr/local/operator
COPY k8s_controller_operator/operator_handler.py operator_handler.py
COPY nms_stack/nms_cli/k8s_nms/config.py config.py
COPY nms_stack/nms_cli/k8s_nms/manifests/e2e_controller /usr/local/operator
CMD kopf run --standalone operator_handler.py --verbose
