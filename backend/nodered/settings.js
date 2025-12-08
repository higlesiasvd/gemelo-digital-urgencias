module.exports = {
    flowFile: 'flows.json',
    flowFilePretty: true,

    // Deshabilitar encriptacion de credenciales para provisionar via archivo
    credentialSecret: false,

    uiPort: process.env.PORT || 1880,

    mqttReconnectTime: 15000,
    serialReconnectTime: 15000,

    debugMaxLength: 1000,

    functionGlobalContext: {
    },

    exportGlobalContextKeys: false,

    logging: {
        console: {
            level: "info",
            metrics: false,
            audit: false
        }
    },

    editorTheme: {
        projects: {
            enabled: false
        }
    }
}
