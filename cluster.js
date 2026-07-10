// src/cluster.js
const { ClusterManager } = require('discord-hybrid-sharding');
const config = require('./config.js');
const path = require('path');

// Target the main.js file in the exact same folder
const botEntryPath = path.join(__dirname, 'main.js');

const manager = new ClusterManager(botEntryPath, {
    totalShards: 'auto',
    token: config.token,
});

manager.on('clusterCreate', cluster => {
    console.log(`Launched Cluster ${cluster.id}`);
});

manager.spawn();

