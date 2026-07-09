// src/cluster.js
const { ClusterManager } = require('discord-hybrid-sharding');
const config = require('./config.js');
const path = require('path');

// Target the actual bot entry file (e.g., index.js in the root folder)
const botEntryPath = path.join(__dirname, '..', 'index.js');

const manager = new ClusterManager(botEntryPath, {
    totalShards: 'auto',
    token: config.token,
});

manager.on('clusterCreate', cluster => {
    console.log(`Launched Cluster ${cluster.id}`);
});

manager.spawn();

