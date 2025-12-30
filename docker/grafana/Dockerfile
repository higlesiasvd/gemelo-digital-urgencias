FROM grafana/grafana:10.2.0

# Instalar plugins necesarios como root
USER root
RUN grafana-cli plugins install grafana-clock-panel && \
    grafana-cli plugins install grafana-piechart-panel && \
    grafana-cli plugins install marcusolsson-treemap-panel && \
    grafana-cli plugins install volkovlabs-image-panel && \
    grafana-cli plugins install grafana-polystat-panel && \
    chown -R grafana:root /var/lib/grafana/plugins

# Copiar configuración de datasources y dashboards
COPY provisioning/datasources /etc/grafana/provisioning/datasources
COPY provisioning/dashboards /etc/grafana/provisioning/dashboards

# Establecer permisos correctos
RUN chown -R grafana:root /etc/grafana/provisioning && \
    chmod -R 755 /etc/grafana/provisioning && \
    chown -R grafana:root /var/lib/grafana

USER grafana
