FROM nodered/node-red:3.1

# Instalar nodos adicionales
RUN npm install --unsafe-perm \
    node-red-contrib-kafka-client \
    node-red-contrib-influxdb \
    node-red-dashboard

# Copiar flujos, credenciales y configuración como root, luego cambiar permisos
USER root
COPY flows.json /data/flows.json
COPY flows_cred.json /data/flows_cred.json
COPY settings.js /data/settings.js
RUN chown -R node-red:node-red /data
USER node-red

# Exponer puerto
EXPOSE 1880
