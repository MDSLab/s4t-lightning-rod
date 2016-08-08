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


var running = require('is-running');

var helpers = require('../../utils/helpers');

/**
 * Wraps a single plugin process
 *
 * @param wrapperProcess
 * @param isSync
 * @constructor
 */
function RunningPlugin(wrapperProcess, isSync) {
    this.wrapperProcess = wrapperProcess;
    this.isSync = isSync;  // eslint-disable-line no-sync
}

/**
 * Tells whether it's still running or not
 * @returns {boolean}
 */
RunningPlugin.prototype.isRunning = function () {
    return !!running(this.wrapperProcess.pid);
};

/**
 * Kills the process
 * @param signal optional, as string. see
 * https://nodejs.org/api/child_process.html#child_process_child_kill_signal
 */
RunningPlugin.prototype.kill = function (signal) {
    this.wrapperProcess.kill(signal);
};


/**
 * Used to track plugins' wrapper processes locally.
 *
 * @constructor
 */
function RunningPluginsTracker() {
    this._runningPlugins = {};
}

/**
 * Add new wrapper process
 *
 * @param pluginName
 * @param wrapperProcess
 * @param isSync
 */
RunningPluginsTracker.prototype.add = function (pluginName, wrapperProcess, isSync) {
    this._runningPlugins[pluginName] = new RunningPlugin(wrapperProcess, isSync);
};

/**
 * Tells whether wrapper process for that plugin is alive or not
 *
 * @param pluginName
 * @returns {boolean}
 */
RunningPluginsTracker.prototype.isAlive = function (pluginName) {
    if (!{}.hasOwnProperty.call(this._runningPlugins, pluginName)) {
        return false;
    }

    if (!this._runningPlugins[pluginName].isRunning()) {
        delete this._runningPlugins[pluginName];
        return false;
    }

    return true;
};

/**
 * Kills wrapper process
 *
 * @param pluginName
 * @param signal optional, as string.
 */
RunningPluginsTracker.prototype.kill = function (pluginName, signal) {
    if (!{}.hasOwnProperty.call(this._runningPlugins, pluginName)) {
        throw new Error("No such plugin");
    }

    this._runningPlugins[pluginName].kill(signal);

    delete this._runningPlugins[pluginName];
};


/**
 * Iterates through each added plugin
 * @param callback function(pluginName, runningPlugin)
 */
RunningPluginsTracker.prototype.each = function(callback) {
    var k = helpers.objectKeys(this._runningPlugins);
    for (var i = 0; i < k.length; i++) {
        var pluginName = k[i];
        var runningPlugin = this._runningPlugins[pluginName];
        callback(pluginName, runningPlugin);
    }
};

module.exports = RunningPluginsTracker;
