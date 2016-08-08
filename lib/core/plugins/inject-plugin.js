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

var fspromised = require('../../utils/fspromised');
var StatusError = require('./status-error');
var JsonConfigsUtils = require('../../utils/json-configs-utils');
var constants = require('../../shared/constants/plugin');

var pluginsState = require('./_state');


module.exports = function (pluginName, pluginJsCodeString, autostart) {
    autostart = JsonConfigsUtils.fixBoolFromString(autostart || false);

    if (pluginsState._runningPluginsTracker.isAlive(pluginName)) {
        throw new StatusError("Plugin with that name is already running. Kill it first!");
    }

    return fspromised.writeFile(pluginsState.getPluginPathByName(pluginName), pluginJsCodeString)
        .then(function () {
            return pluginsState.readGlobalPluginsConfig();
        })
        .then(function (pluginsConf) {
            pluginsConf.plugins[pluginName] = {};
            pluginsConf.plugins[pluginName].status = constants.pluginStatus.injected;
            pluginsConf.plugins[pluginName].autostart = autostart;

            return pluginsState.writeGlobalPluginsConfig(pluginsConf);
        });
};

