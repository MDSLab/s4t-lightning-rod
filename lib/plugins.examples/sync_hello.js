/*
 *				 Apache License
 *                           Version 2.0, January 2004
 *                        http://www.apache.org/licenses/
 *
 *      Copyright (c) 2014 2015 2016 Dario Bruneo, Francesco Longo, Giovanni Merlino,
 *      Andrea Rocco Lotronto, Arthur Warnier, Nicola Peditto, Kostya Esmukov
 *
 */
"use strict";

var Q = require('q');

var util = require('util');
var BaseSyncPlugin = require('s4t-lightning-rod/lib/pluginapi/basesync');
var PluginAPI = require('s4t-lightning-rod/lib/pluginapi/api');

var logger = PluginAPI.getLogger("hello");


function HelloPlugin(args) {
    BaseSyncPlugin.call(this, args);

    this._intervalId = null;

}
util.inherits(HelloPlugin, BaseSyncPlugin);


HelloPlugin.prototype.call = function () {
    return Q.Promise(function(resolve) {
        var result = 'PLUGIN ALIVE!';
        logger.info(result);
        resolve(result);
    });
};


module.exports = HelloPlugin;
