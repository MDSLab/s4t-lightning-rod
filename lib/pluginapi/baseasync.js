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
 * Base class for asynchronous plugins
 *
 * @constructor
 * @abstract
 */
function BaseAsyncPlugin(pluginConf) {
    if (this.constructor === BaseAsyncPlugin) {
        throw new Error("Can't instantiate abstract class!");
    }

    BasePlugin.call(this, pluginConf);

}
util.inherits(BaseAsyncPlugin, BasePlugin);


/**
 * Start asynchronous plugin.
 *
 * @abstract
 */
BaseAsyncPlugin.prototype.start = function () {
    throw new Error("Abstract method!");
};


/**
 * Stop asynchronous plugin.
 * Make sure to run only synchronous code here.
 *
 * @abstract
 */
BaseAsyncPlugin.prototype.stop = function () {
    throw new Error("Abstract method!");
};


module.exports = BaseAsyncPlugin;
