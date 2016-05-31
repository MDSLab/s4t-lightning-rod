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


/**
 * Base class for plugins
 *
 * @constructor
 * @abstract
 */
function BasePlugin() {
    if (this.constructor === BasePlugin) {
        throw new Error("Can't instantiate abstract class!");
    }

}


/**
 * Start asynchronous plugin.
 *
 * @abstract
 */
BasePlugin.prototype.start = function () {
    throw new Error("Abstract method!");
};


/**
 * Stop asynchronous plugin.
 * Make sure to run only synchronous code here.
 *
 * @abstract
 */
BasePlugin.prototype.stop = function () {
    throw new Error("Abstract method!");
};


/**
 * Call synchronous plugin.
 *
 * @abstract
 * @returns {Q.Promise}
 */
BasePlugin.prototype.call = function () {
    throw new Error("Abstract method!");
};


/**
 * Cleanup, called once before process exit.
 * Please note that there's no guarantee that it will be called!
 * Make sure to run only synchronous code here.
 *
 * stop method will be called right before this one.
 */
BasePlugin.prototype.cleanup = function () {
};

module.exports = BasePlugin;