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
var BasePlugin = require('../core/process/plugin/base');
var PluginAPI = require('../core/process/plugin/api');

var logger = PluginAPI.getLogger("hello");


function HelloPlugin(args) {
    BasePlugin.call(this, args);

    this._intervalId = null;

}
util.inherits(HelloPlugin, BasePlugin);

HelloPlugin.prototype._compute = function () {
    return 'PLUGIN ALIVE!';
};


HelloPlugin.prototype.start = function () {
    this._intervalId = setInterval(function () {
        logger.info(this._compute());

    }.bind(this), 3000);
};

HelloPlugin.prototype.stop = function () {
    clearInterval(this._intervalId);
    this._intervalId = null;
};

HelloPlugin.prototype.call = function () {
    var d = Q.defer();

    var result = this._compute();
    logger.info(result);

    d.resolve(result);

    return d.promise;
};


module.exports = HelloPlugin;