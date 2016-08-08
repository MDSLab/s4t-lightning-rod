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

var fork = require('child_process').fork;

var Q = require('q');

var logger = require('../../utils/log4js-wrapper').getLogger("Plugins");

var JsonConfigsUtils = require('../../utils/json-configs-utils');
var StatusError = require('./status-error');
var constants = require('../../shared/constants/plugin');

var NoopError = require('./noop-error');
var pluginsState = require('./_state');

var pluginsProcessRelPath = __dirname + '/../../process/plugin';


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


module.exports = {
    startAsynchronousPlugin: function (pluginName, pluginConf) {
        return runPlugin(pluginName, pluginConf, false);
    },
    callSynchronousPlugin: function (pluginName, pluginConf) {
        return runPlugin(pluginName, pluginConf, true);
    }
};
