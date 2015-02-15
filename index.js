#!/usr/bin/env node

'use strict';

var core = require('paukan-core');
var RemoteService = require('./lib/connection');

var config = core.common.serviceConfig(require('./config.json'), require('./package.json'));

var service = new core.Service(config);
service.network.local.on('online', function () {
    console.log('Service "%s" is ready', service.id);

    for(var name in config.sources) {
        new RemoteService(name, config.sources[name], service.network);
    }

});
