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

var BasePlugin = require('./../process/plugin/_base');


/**
 * Base class for synchronous plugins
 *
 * @constructor
 * @abstract
 */
function BaseSyncPlugin(pluginConf) {
    if (this.constructor === BaseSyncPlugin) {
        throw new Error("Can't instantiate abstract class!");
    }

    BasePlugin.call(this, pluginConf);

}
util.inherits(BaseSyncPlugin, BasePlugin);


/**
 * Call synchronous plugin.
 *
 * @abstract
 * @returns {Q.Promise} fulfills to a result
 */
BaseSyncPlugin.prototype.call = function () {
    throw new Error("Abstract method!");
};


/**
 * Cleanup, called once before process exit.
 * Please note that there's no guarantee that it will be called!
 * Make sure to run only synchronous code here.
 *
 * stop method will be called right before this one.
 */
BaseSyncPlugin.prototype.cleanup = function () {
};

module.exports = BaseSyncPlugin;
