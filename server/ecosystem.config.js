module.exports = {
    apps: [
        {
            name: 'vms-server',
            script: './dist/index.js',
            env_production: {
                NODE_ENV: 'production',
                PORT: 3000
            }
        }
    ]
};
