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

var NoopError = require('./noop-error');

var pluginsState = require('./_state');

var injectPlugin = require('./inject-plugin');
var removePlugin = require('./remove-plugin');
var runPlugin = require('./run-plugin');
var killPlugin = require('./kill-plugin');
var restartAllActivePlugins = require('./restart-all-active-plugins');
var autostartPlugins = require('./autostart-plugins');


pluginsState.onPluginRestartIsNeeded = function (pluginName) {
    Plugins.kill(pluginName)
        .catch(function (err) {
            if (err instanceof NoopError) {
                // already stopped plugin is not a failure
                return;
            }
            throw err;
        })
        .then(function () {
            // todo ?? set pid to "" in the global conf
            return pluginsState.readPluginConfig(pluginName);
        })
        .then(function (pluginConf) {
            return Plugins.startAsynchronousPlugin(pluginName, pluginConf);
        })
        .done();
};


/**
 * Plugins subsystem singleton
 */
var Plugins = module.exports = {};

/**
 * Returns PluginsState
 *
 * @returns {PluginsState}
 */
Plugins.getState = function () {
    return pluginsState;
};

/**
 * Create a plugin with that name and sourcecode
 *
 * @param pluginName
 * @param pluginJsCodeString
 * @param autostart
 * @throws {StatusError} if plugin with such name is already running
 * @returns {Q.Promise}
 */
Plugins.injectPlugin = function (pluginName, pluginJsCodeString, autostart) {
    return injectPlugin(pluginName, pluginJsCodeString, autostart);
};


/**
 * Remove the plugin with that name
 *
 * @param pluginName
 * @throws {StatusError} if plugin with such name is still running
 * @returns {Q.Promise}
 */
Plugins.removePlugin = function (pluginName) {
    return removePlugin(pluginName);
};


/**
 * Starts asynchronous plugin
 * @param pluginName
 * @param pluginConf
 * @throws {StatusError} if plugin with such name is still running
 * @returns {Q.Promise}
 */
Plugins.startAsynchronousPlugin = function (pluginName, pluginConf) {
    return runPlugin.startAsynchronousPlugin(pluginName, pluginConf);
};


/**
 * Calls synchronous plugin
 * @param pluginName
 * @param pluginConf
 * @throws {StatusError} if plugin with such name is still running
 * @returns {Q.Promise} fulfills to the result of the call
 */
Plugins.callSynchronousPlugin = function (pluginName, pluginConf) {
    return runPlugin.callSynchronousPlugin(pluginName, pluginConf);
};


/**
 * Kills (stops) the running plugin
 * @param pluginName
 * @returns {Q.Promise}
 */
Plugins.kill = function (pluginName) {
    return killPlugin(pluginName);
};


/**
 * Restarts all active plugins on the board
 * @returns {Q.Promise}
 */
Plugins.restartAllActivePlugins = function () {  // todo was marked as DEPRECATED
    return restartAllActivePlugins();
};


/**
 * Start async plugins which should be autostarted
 * @returns {Q.Promise}
 */
Plugins.autostartPlugins = function () {
    return autostartPlugins();
};

