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

var NoopError = require('./noop-error');

var constants = require('../../shared/constants/plugin');

var pluginsState = require('./_state');


module.exports = function (pluginName) {
    return pluginsState.readGlobalPluginsConfig()
        .then(function (pluginsConf) {
            if (!{}.hasOwnProperty.call(pluginsConf.plugins, pluginName)) {
                logger.warn("[PLUGIN] --> Plugin \"" + pluginName
                    + "\" does not exist on this board!");
                throw new Error("No such plugin: " + pluginName);
            }

            var status = pluginsConf.plugins[pluginName].status;
            // var autostart = JsonConfigsUtils.fixBoolFromString(
            // pluginsConf.plugins[pluginName].autostart);
            var isAlive = pluginsState._runningPluginsTracker.isAlive(pluginName);

            if (status !== constants.pluginStatus.on && !isAlive) {
                logger.warn('[PLUGIN] --> ' + pluginName
                    + ' - Plugin is not running on this board!');
                throw new NoopError("Plugin is not running on this board!");
            }

            if (isAlive) {
                pluginsState._runningPluginsTracker.kill(pluginName);
            } else {
                // probably impossible
                var pid = pluginsConf.plugins[pluginName].pid;
                process.kill(pid);
            }

            pluginsConf.plugins[pluginName].status = constants.pluginStatus.off;
            pluginsConf.plugins[pluginName].pid = "";


            /*
             // delete the plugin json configuration file if it doesn't
             // have to be executed at boot time
             if (autostart == "false"){

             fs.unlink('./plugin_conf/'+plugin_name+'.json', function (err) {
             if (err) throw err;
             logger.info('JSON schema of '+ plugin_name +' successfully deleted!');
             });
             }
             */

            return pluginsState.writeGlobalPluginsConfig(pluginsConf);
        });
};
