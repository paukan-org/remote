'use strict';

var async = require('async');
var ld = require('lodash-node');

var wsEventEmitter = require('websocket-eventemitter2');
var EventEmitter2 = require('eventemitter2').EventEmitter2;

function RemoteService(name, config, network) {


    var self = this;
    // create connection to remove service and proxy all events into local emitter
    var eventEmitter2 = new EventEmitter2({ wildcard: true, delimiter: '.'});
    this.remoteEmitter = new wsEventEmitter.Client(config, eventEmitter2);

    this.listenNetworkEvents = config.networkEvents || ['request.'+name+'.*.*', 'request.global.*.*' ];
    this.listenRemoteEvents = config.networkEvents || ['request.'+name+'.*.*', 'reply.'+name+'.*.*', 'state.'+name+'.*.*'];
    this.network = network;
    var startProxyRemoteEvents = ld.once(this.startProxyRemoteEvents.bind(this));

    this.remoteEmitter.client.on('error', function (err) {
        console.error('[%s] error: %s', name, err.message);
    });

    this.remoteEmitter.client.on('open', function () {
        console.log('[%s] connected to %s', name, config.url);
        startProxyRemoteEvents();
        self.startProxyLocalEvents();
    });

    this.remoteEmitter.client.on('close', function () {
        console.log('[%s] disconnected from %s', name, config.url);
        self.stopProxyLocalEvents();
    });
}

// proxy all events from remote service to network
RemoteService.prototype.startProxyRemoteEvents = function(callback) {
    var remoteEmitter = this.remoteEmitter, emit = this.network.emit.bind(this.network);
    console.log(this.listenRemoteEvents);
    async.each(this.listenRemoteEvents, function(event, next) {
        remoteEmitter.on(event, function() {
            var argv = ld.values(arguments);
            argv.unshift(this.event || event);
            emit.apply(null, argv);
        }, next);
    }, callback || ld.noop);
};

RemoteService.prototype.startProxyLocalEvents = function(callback) {
    var self = this;
    async.each(this.listenNetworkEvents, function(event, next) {
        self.network.on(event, function() { // proxy network event to remote service
            var argv = ld.values(arguments);
            argv.unshift(this.event || event);
            self.remoteEmitter.emit.apply(null, argv);
        }, next);
    }, callback || ld.noop);
};

RemoteService.prototype.stopProxyLocalEvents = function(callback) {
    this.network.removeAllListeners(callback || ld.noop);
};

module.exports = RemoteService;
