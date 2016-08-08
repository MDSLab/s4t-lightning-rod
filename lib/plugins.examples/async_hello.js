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

var util = require('util');
var BaseAsyncPlugin = require('s4t-lightning-rod/lib/pluginapi/baseasync');
var PluginAPI = require('s4t-lightning-rod/lib/pluginapi/api');

var logger = PluginAPI.getLogger("hello");


function HelloPlugin(args) {
    BaseAsyncPlugin.call(this, args);

    this._intervalId = null;

}
util.inherits(HelloPlugin, BaseAsyncPlugin);


HelloPlugin.prototype.start = function () {
    this._intervalId = setInterval(function () {
        logger.info('PLUGIN ALIVE!');

    }.bind(this), 3000);
};

HelloPlugin.prototype.stop = function () {
    clearInterval(this._intervalId);
    this._intervalId = null;
};


module.exports = HelloPlugin;
