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
var fork = require('child_process').fork;

var Q = require('q');

var fspromised = require('../../utils/fspromised');
var logger = require('../../utils/log4js-wrapper').getLogger("Plugins");
var helpers = require('../../utils/helpers');
var constants = require('../../shared/constants/plugin');

var JsonConfigsUtils = require('../../utils/json-configs-utils');

var NoopError = require('./noop-error');
var StatusError = require('./status-error');
var TypeError = require('./type-error');
var PeriodicalWatchdogRunningPluginsTracker = require('./watchdog-running-tracker');

var pluginsState = require('./_state');

var pluginsProcessRelPath = '../../process/plugin';


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


/**
 * Remove the plugin with that name
 *
 * @param pluginName
 * @throws {StatusError} if plugin with such name is still running
 * @returns {Q.Promise}
 */
Plugins.removePlugin = function (pluginName) {

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


/**
 * Starts plugin process
 * @param pluginName
 * @param pluginConf
 * @param isSync
 * @returns {Q.Promise}
 */
function execPluginProcess(pluginName, pluginConf, isSync) {
    return Q.Promise(function (resolve, reject) {
        // The autostart parameter at RUN stage is OPTIONAL. It is used at this stage
        // if the user needs to change the boot execution configuration of the plugin
        // after the INJECTION stage.
        var pluginAutostart = JsonConfigsUtils.fixBoolFromString(pluginConf.autostart);

        //Create a new process that has plugin-wrapper as code
        var childProcess = fork(pluginsProcessRelPath);

        //Prepare the message I will send to the process with name of the plugin to
        // start and json file as argument
        var inputMessage = {
            pluginName: pluginName,
            pluginConf: pluginConf,
            pluginIsSync: isSync
        };

        childProcess.on('message', function (msg) {
            if (msg.uncaughtException) {
                logger.error("Uncaught exception in a child process: " + msg.uncaughtException);
                return;
            }

            if (msg.name === undefined) {
                //serve per gestire il primo messaggio alla creazione del child
                logger.info("[PLUGIN] --> " + msg);
                return;
            }

            if (msg.status === constants.messageStatus.badtype) {
                reject(new TypeError(msg.payload));
            } else if (msg.status === constants.messageStatus.alive) {

                var p = pluginsState.writePluginConfig(pluginName, pluginConf)
                    .then(function () {
                        logger.info('[PLUGIN] - ' + pluginName + ' - Plugin JSON schema saved to '
                            + pluginsState.getPluginConfPathByName(pluginName));

                        return pluginsState.readGlobalPluginsConfig();
                    })
                    .then(function (pluginsConf) {

                        if (!isSync) {
                            // Updating the plugins.json file:
                            // - check if the user changed the autostart parameter at this stage
                            if (pluginAutostart !== undefined) {
                                pluginsConf.plugins[pluginName].autostart = pluginAutostart;
                                logger.info('[PLUGIN] - ' + pluginName
                                    + ' - Autostart parameter set by user to ' + pluginAutostart);
                            } else {
                                logger.info('[PLUGIN] - ' + pluginName
                                    + ' - Autostart parameter not changed!');
                            }
                        }

                        // - change the plugin status from "off" to "on" and update the PID value
                        pluginsConf.plugins[pluginName].status = constants.pluginStatus.on;
                        pluginsConf.plugins[pluginName].pid = childProcess.pid;

                        return pluginsState.writeGlobalPluginsConfig(pluginsConf);
                    });

                if (!isSync) {
                    resolve(p);
                } else {
                    p.done();
                }
            } else if (isSync && msg.status === constants.messageStatus.finish) {
                // sync finish

                logger.info("[PLUGIN] --> RESULT: ", msg.payload);
                resolve(msg.payload);

            } else {  // log
                logger.info("[PLUGIN] - " + msg.name + " - " + msg.payload);
            }
        });

        childProcess.on('error', function (err) {
            reject(err);
        });

        childProcess.on('exit', function (code, signal) {
            var reason = code || signal;  // handle args like (null, 'SIGTERM')
            reject(new Error("Child process exited with error code: " + reason));
        });

        // todo what about close(stdio pipe) and disconnect(IPC) events?

        // I send the input to the wrapper so that it can launch the proper plugin
        // with the proper json file as argument
        childProcess.send(inputMessage);

        pluginsState._runningPluginsTracker.add(pluginName, childProcess, isSync);
    });
}


/**
 * Ensures that global plugins config allows execution of this plugin and starts it
 * @param pluginName
 * @param pluginConf
 * @param isSync
 * @throws {StatusError} if plugin with such name is still running
 * @returns {Q.Promise}
 */
function runPlugin(pluginName, pluginConf, isSync) {
    var type = isSync ? "Call" : "Plugin";  // historical terminology

    if (pluginsState._runningPluginsTracker.isAlive(pluginName)) {
        // todo or kill it right here ??
        throw new StatusError("Plugin with that name is still running. Kill it first!");
    }

    return pluginsState.readGlobalPluginsConfig()
        .then(function (pluginsConf) {
            if (!{}.hasOwnProperty.call(pluginsConf.plugins, pluginName)) {
                logger.warn("[PLUGIN] --> " + type + " \"" + pluginName
                    + "\" does not exist on this board!");
                throw new Error("No such plugin: " + pluginName);
            }

            var status = pluginsConf.plugins[pluginName].status;

            if (status !== constants.pluginStatus.off
                && status !== constants.pluginStatus.injected) {
                logger.warn("[PLUGIN] --> " + type + " already started!");
                throw new NoopError("Already started!");
            }

            logger.info('[PLUGIN] - ' + pluginName + ' - ' + type + ' starting...');

            return execPluginProcess(pluginName, pluginConf, isSync)
                .then(function () {
                    logger.info("[PLUGIN] --> " + type + " started!");
                });
        });
}

/**
 * Starts asynchronous plugin
 * @param pluginName
 * @param pluginConf
 * @throws {StatusError} if plugin with such name is still running
 * @returns {Q.Promise}
 */
Plugins.startAsynchronousPlugin = function (pluginName, pluginConf) {
    return runPlugin(pluginName, pluginConf, false);
};


/**
 * Calls synchronous plugin
 * @param pluginName
 * @param pluginConf
 * @throws {StatusError} if plugin with such name is still running
 * @returns {Q.Promise} fulfills to the result of the call
 */
Plugins.callSynchronousPlugin = function (pluginName, pluginConf) {
    return runPlugin(pluginName, pluginConf, true);
};


/**
 * Kills (stops) the running plugin
 * @param pluginName
 * @returns {Q.Promise}
 */
Plugins.kill = function (pluginName) {
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


/**
 * Restarts all active plugins on the board
 * @returns {Q.Promise}
 */
Plugins.restartAllActivePlugins = function () {  // todo was marked as DEPRECATED

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
                                return Plugins.kill(pluginName);
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
                                return Plugins.startAsynchronousPlugin(pluginName, pluginConf);
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


/**
 * Start async plugins which should be autostarted
 * @returns {Q.Promise}
 */
Plugins.autostartPlugins = function () {

    return pluginsState.readGlobalPluginsConfig()
        .then(function (pluginsConf) {
            var pluginKeys = helpers.objectKeys(pluginsConf.plugins);

            //logger.info('Number of plugins: ' + pluginKeys.length);
            logger.info('[PLUGIN] |- Restarting enabled plugins on board: ');

            var startingPluginsPromises = [];

            for (var i = 0; i < pluginKeys.length; i++) {

                var pluginName = pluginKeys[i];

                var status = pluginsConf.plugins[pluginName].status;
                var autostart = JsonConfigsUtils.fixBoolFromString(
                    pluginsConf.plugins[pluginName].autostart);

                logger.info('[PLUGIN] |--> ' + pluginName + ' - status: ' + status
                    + ' - autostart: ' + autostart);

                if (status === constants.pluginStatus.injected
                    || status !== constants.pluginStatus.on && !autostart) {
                    logger.info("|----> Plugin " + pluginName
                        + " with status OFF and autostart FALSE!");
                    continue;
                }

                // todo ignore sync plugins without starting them explicitly

                (function (pluginName) {
                    // At the moment we set the timeout at 5 seconds between the exection
                    // of the plugins to avoid the simultaneously connection to the
                    // board ("board.connect").
                    startingPluginsPromises.push(
                        Q.delay(7000 * startingPluginsPromises.length)  // todo delay is hardcoded
                            .then(function () {
                                // todo ?? handle absent config file
                                return pluginsState.readPluginConfig(pluginName);
                            })
                            .then(function (pluginConf) {
                                return Plugins.startAsynchronousPlugin(pluginName, pluginConf);
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

            return Q.all(startingPluginsPromises);
        });
};

