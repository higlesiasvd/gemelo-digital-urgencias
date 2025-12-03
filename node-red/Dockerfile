# ═══════════════════════════════════════════════════════════════
# Node-RED para Gemelo Digital Hospitalario
# ═══════════════════════════════════════════════════════════════
FROM nodered/node-red:3.1

# Instalar nodo de InfluxDB
RUN npm install node-red-contrib-influxdb

# Copiar los flujos pre-configurados
COPY flows.json /data/flows.json

# Copiar configuración para desactivar encriptación de credenciales
COPY settings.js /data/settings.js

# Copiar credenciales (token de InfluxDB)
COPY flows_cred.json /data/flows_cred.json
