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

var logger = require('../../utils/log4js-wrapper').getLogger("Plugins");
var helpers = require('../../utils/helpers');
var constants = require('../../shared/constants/plugin');

var JsonConfigsUtils = require('../../utils/json-configs-utils');

var NoopError = require('./noop-error');

var runPlugin = require('./run-plugin');
var killPlugin = require('./kill-plugin');


var pluginsState = require('./_state');


module.exports = function () {  // todo was marked as DEPRECATED

    return pluginsState.readGlobalPluginsConfig()
        .then(function (pluginsConf) {
            var pluginKeys = helpers.objectKeys(pluginsConf.plugins);

            logger.info('Number of plugins: ' + pluginKeys.length);

            var restartingPluginsPromises = [];

            for (var i = 0; i < pluginKeys.length; i++) {

                var pluginName = pluginKeys[i];

                var status = pluginsConf.plugins[pluginName].status;
                var pid = pluginsConf.plugins[pluginName].pid;
                var autostart = JsonConfigsUtils.fixBoolFromString(
                    pluginsConf.plugins[pluginName].autostart);

                logger.info("|--> " + pluginName + ': autostart < ' + autostart + ' > '
                    + '- status < ' + status + ' > ' + pid);

                if (status !== constants.pluginStatus.on && !autostart) {
                    logger.info("|----> Plugin " + pluginName
                        + " with status OFF and autostart FALSE!");
                    continue;
                }

                // todo ignore sync plugins without starting them explicitly

                (function (pluginName) {
                    // At the moment we set the timeout at 5 seconds between the exection
                    // of the plugins to avoid the simultaneously connection to the
                    // board ("board.connect").
                    restartingPluginsPromises.push(
                        Q.delay(7000 * restartingPluginsPromises.length) // todo delay is hardcoded
                            .then(function () {
                                return killPlugin(pluginName);
                            })
                            .catch(function (err) {
                                if (err instanceof NoopError) {
                                    // already stopped plugin is not a failure
                                    return;
                                }
                                throw err;
                            })
                            .then(function () {
                                // todo ?? handle absent config file
                                return pluginsState.readPluginConfig(pluginName);
                            })
                            .then(function (pluginConf) {
                                return runPlugin.startAsynchronousPlugin(pluginName, pluginConf);
                            })
                            .catch(function (err) {
                                if (err instanceof TypeError) {
                                    // ignore sync plugins
                                    return;
                                }
                                throw err;
                            })
                    );
                })(pluginName);
            }

            return Q.all(restartingPluginsPromises);
        });
};
