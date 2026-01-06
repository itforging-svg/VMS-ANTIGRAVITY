module.exports = {
    apps: [{
        name: "vms-server",
        script: "./dist/index.js",
        instances: 1,
        exec_mode: "fork",
        env: {
            NODE_ENV: "production",
            PORT: 3000
        },
        env_production: {
            NODE_ENV: "production",
            PORT: 3000
        }
    }]
}
