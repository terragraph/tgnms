# Jupyter
The `jupyter` service is a web application for developing live Python code
and visualizations. It is exposed behind the `/jupyter` endpoint on the NMS
backend.

The service comes equipped with `matplotlib`, `numpy`, and `pandas` to
facilitate statistical modeling and visualizations. In addition, the `tglib`
HTTP server is automatically started upon running the first Jupyter kernel. The
primary purpose of this server is to expose the `/metrics/<duration>` endpoint
for testing Prometheus metric publishing. All Prometheus metrics generated from
this service are automatically prepended with `jupyter_` in order to prevent
name collisions with existing metrics.
