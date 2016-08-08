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

var logger = require('../../utils/log4js-wrapper').getLogger("Plugins");

var fspromised = require('../../utils/fspromised');
var StatusError = require('./status-error');

var pluginsState = require('./_state');


module.exports = function (pluginName) {

    if (pluginsState._runningPluginsTracker.isAlive(pluginName)) {
        // todo or kill it right here ??
        throw new StatusError("Plugin with that name is still running. Kill it first!");
    }

    // Promises are chained (not started simultaneously) in order to
    // get a consistent reason of a fail (if any).

    return pluginsState.readGlobalPluginsConfig()
        .then(function (pluginsConf) {
            if (!{}.hasOwnProperty.call(pluginsConf.plugins, pluginName)) {
                logger.warn("[PLUGIN] --> plugins.json is already clean!");
                //var response = pluginName + " completely removed from board!";
                //logger.info("[PLUGIN] --> " + pluginName
                // + " - plugin completely removed from board!");
                return;
            }

            delete pluginsConf.plugins[pluginName];

            logger.debug("[PLUGIN] --> Plugin node successfully removed from plugins.json!");

            return pluginsState.writeGlobalPluginsConfig(pluginsConf);
        })
        .then(function () {
            return fspromised.unlink(pluginsState.getPluginPathByName(pluginName));
            //    logger.warn("[PLUGIN] --> Plugin " + pluginName + " not found!");
        })
        .then(function () {
            return fspromised.unlink(pluginsState.getPluginConfPathByName(pluginName));
            //    logger.warn("[PLUGIN] --> " + pluginConfFileName + " file does not exist!");
        });
};
