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

var nconf = require('nconf');
var fork = require('child_process').fork;

var fspromised = require('./../utils/fspromised');
var ConfigError = require('./../utils/config-error');
var NoopError = require('./plugins/noop-error');
var logger = require('./../utils/log4js-wrapper').getLogger("Plugins");
var helpers = require('./../utils/helpers');
var Board = require('./board');
var shared = require('./process/shared/plugin');


var pluginsState = new PluginsState();


/**
 * Plugins subsystem state.
 * Don't ever cache it's results, because they might be changed at any time.
 *
 * @constructor
 */
function PluginsState() {
    this._globalPluginsConfigFilepath = null;
    this._pluginsUploadDir = null;
    this._pluginsConfDir = null;

}


/**
 * Returns false if PluginsState is not loaded yet
 *
 * @returns {boolean}
 */
PluginsState.prototype.isLoaded = function () {
    return this._globalPluginsConfigFilepath !== null;
};


/**
 * Reloads Plugins subsystem state
 *
 * @throws {ConfigError}
 * @param nconf_ might be omitted
 */
PluginsState.prototype.reload = function (nconf_) {
    nconf_ = nconf_ || nconf;

    // todo
    this._globalPluginsConfigFilepath = "./plugins.json";
    this._pluginsUploadDir = "./plugins/";
    this._pluginsConfDir = "./plugin_conf/";
};


/**
 * Returns target path to the pluginName
 * @param pluginName
 * @returns {string}
 */
PluginsState.prototype._getPluginPathByName = function (pluginName) {
    return this._pluginsUploadDir + pluginName + ".js";
};

/**
 * Returns target path to the pluginName's own config
 * @param pluginName
 * @returns {string}
 */
PluginsState.prototype._getPluginConfPathByName = function (pluginName) {
    return this._pluginsConfDir + pluginName + ".js";
};


/**
 * Reads global plugins config file
 * @returns {Q.Promise}
 */
PluginsState.prototype._readGlobalPluginsConfig = function () {
    return fspromised.readFile(this._globalPluginsConfigFilepath)
        .then(function (data) {
            return JSON.parse(data);
        });
};


/**
 * Saves global plugins config file
 * @param pluginsConf
 * @returns {Q.Promise}
 */
PluginsState.prototype._writeGlobalPluginsConfig = function (pluginsConf) {
    return fspromised.writeFile(this._globalPluginsConfigFilepath, JSON.stringify(pluginsConf, null, 4));
};


/**
 * Reads plugin's own config file
 * @param pluginName
 * @returns {Q.Promise}
 */
PluginsState.prototype._readPluginConfig = function (pluginName) {
    return fspromised.readFile(this._getPluginConfPathByName(pluginName))
        .then(function (data) {
            return JSON.parse(data);
        });
};

/**
 * Saves plugin's own config file
 * @param pluginName
 * @param pluginConf
 * @returns {Q.Promise}
 */
PluginsState.prototype._writePluginConfig = function (pluginName, pluginConf) {
    return fspromised.writeFile(this._getPluginConfPathByName(pluginName), JSON.stringify(pluginConf, null, 4));
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
 * @returns {Q.Promise}
 */
Plugins.injectPlugin = function (pluginName, pluginJsCodeString, autostart) {
    autostart = autostart || false;

    return fspromised.writeFile(pluginsState._getPluginPathByName(pluginName), pluginJsCodeString)
        .then(function () {
            return pluginsState._readGlobalPluginsConfig();
        })
        .then(function (pluginsConf) {
            pluginsConf.plugins[pluginName] = {};
            pluginsConf.plugins[pluginName].status = shared.pluginStatusChoices.injected;
            pluginsConf.plugins[pluginName].autostart = autostart;

            return pluginsState._writeGlobalPluginsConfig(pluginsConf);
        });
};


/**
 * Remove the plugin with that name
 *
 * @param pluginName
 * @returns {Q.Promise}
 */
Plugins.removePlugin = function (pluginName) {

    // Promises are chained (not started simultaneously) in order to get a consistent reason of a fail (if any).

    return pluginsState._readGlobalPluginsConfig()
        .then(function (pluginsConf) {
            if (!pluginsConf.plugins.hasOwnProperty(pluginName)) {
                logger.warn("[PLUGIN] --> plugins.json is already clean!");
                //var response = pluginName + " completely removed from board!";
                //logger.info("[PLUGIN] --> " + pluginName + " - plugin completely removed from board!");
                return;
            }

            delete pluginsConf.plugins[pluginName];

            logger.debug("[PLUGIN] --> Plugin node successfully removed from plugins.json!");

            return pluginsState._writeGlobalPluginsConfig(pluginsConf);
        })
        .then(function () {
            return fspromised.unlink(pluginsState._getPluginPathByName(pluginName));
            //    logger.warn("[PLUGIN] --> Plugin " + pluginName + " not found!");
        })
        .then(function () {
            return fspromised.unlink(pluginsState._getPluginConfPathByName(pluginName));
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
        // The autostart parameter at RUN stage is OPTIONAL. It is used at this stage if the user needs to change the boot execution configuration of the plugin after the INJECTION stage.
        var pluginAutostart = pluginConf.autostart;

        //Create a new process that has plugin-wrapper as code
        var childProcess = fork('./process/plugin');

        //Prepare the message I will send to the process with name of the plugin to start and json file as argument
        var inputMessage = {
            "pluginName": pluginName,
            "pluginConf": pluginConf,
            "pluginIsSync": isSync
        };

        childProcess.on('message', function (msg) {
            if (msg.name === undefined) {
                //serve per gestire il primo messaggio alla creazione del child
                logger.info("[PLUGIN] --> " + msg);
                return;
            }

            if (msg.status === shared.messageStatusChoices.alive) {

                var p = pluginsState._writePluginConfig(pluginName, pluginConf)
                    .then(function () {
                        logger.info('[PLUGIN] - ' + pluginName + ' - Plugin JSON schema saved to ' + pluginsState._getPluginConfPathByName(pluginName));

                        return pluginsState._readGlobalPluginsConfig();
                    })
                    .then(function (pluginsConf) {

                        if (!isSync) {
                            // Updating the plugins.json file:
                            // - check if the user changed the autostart parameter at this stage
                            if (pluginAutostart !== undefined) {
                                pluginsConf.plugins[pluginName].autostart = pluginAutostart;
                                logger.info('[PLUGIN] - ' + pluginName + ' - Autostart parameter set by user to ' + pluginAutostart);
                            } else {
                                logger.info('[PLUGIN] - ' + pluginName + ' - Autostart parameter not changed!');
                            }
                        }

                        // - change the plugin status from "off" to "on" and update the PID value
                        pluginsConf.plugins[pluginName].status = shared.pluginStatusChoices.on;
                        pluginsConf.plugins[pluginName].pid = childProcess.pid;

                        return pluginsState._writeGlobalPluginsConfig(pluginsConf);
                    });

                if (!isSync) {
                    resolve(p
                        .then(function () {
                            // todo !!!!!!!!!! exports.pluginKeepAlive(plugin_name);
                        }));
                } else {
                    p.done();
                }
            } else if (isSync && msg.status === shared.messageStatusChoices.finish) {
                // sync finish

                // todo
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
            reject(new Error("Child process exited with error code: " + code))
        });

        // todo what about close(stdio pipe) and disconnect(IPC) events?

        //I send the input to the wrapper so that it can launch the proper plugin with the proper json file as argument
        childProcess.send(inputMessage);
    });
}


/**
 * Ensures that global plugins config allows execution of this plugin and starts it
 * @param pluginName
 * @param pluginConf
 * @param isSync
 * @returns {Q.Promise}
 */
function runPlugin(pluginName, pluginConf, isSync) {
    var type = isSync ? "Call" : "Plugin";  // historical terminology

    return pluginsState._readGlobalPluginsConfig()
        .then(function (pluginsConf) {
            if (!pluginsConf.plugins.hasOwnProperty(pluginName)) {
                logger.warn("[PLUGIN] --> " + type + " \"" + pluginName + "\" does not exist on this board!");
                throw new Error("No such plugin: " + pluginName);
            }

            var status = pluginsConf.plugins[pluginName].status;

            if (status != shared.pluginStatusChoices.off && status != shared.pluginStatusChoices.injected) {
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
 * @returns {Q.Promise}
 */
Plugins.startAsynchronousPlugin = function (pluginName, pluginConf) {
    return runPlugin(pluginName, pluginConf, false);
};


/**
 * Calls synchronous plugin
 * @param pluginName
 * @param pluginConf
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
    return pluginsState._readGlobalPluginsConfig()
        .then(function (pluginsConf) {
            if (!pluginsConf.plugins.hasOwnProperty(pluginName)) {
                logger.warn("[PLUGIN] --> " + type + " \"" + pluginName + "\" does not exist on this board!");
                throw new Error("No such plugin: " + pluginName);
            }

            var status = pluginsConf.plugins[pluginName].status;
            var autostart = pluginsConf.plugins[pluginName].autostart;

            if (status != shared.pluginStatusChoices.on) {
                logger.warn('[PLUGIN] --> ' + pluginName + ' - Plugin is not running on this board!');
                throw new NoopError("Plugin is not running on this board!");
            }

            // todo what about stale processes ???
            var pid = pluginsConf.plugins[pluginName].pid;
            process.kill(pid);

            pluginsConf.plugins[pluginName].status = shared.pluginStatusChoices.off;
            pluginsConf.plugins[pluginName].pid = "";

            // todo clearPluginTimer(plugin_name);

            /*
             // delete the plugin json configuration file if it doesn't have to be executed at boot time
             if (autostart == "false"){

             fs.unlink('./plugin_conf/'+plugin_name+'.json', function (err) {
             if (err) throw err;
             logger.info('JSON schema of '+ plugin_name +' successfully deleted!');
             });
             }
             */

            return pluginsState._writeGlobalPluginsConfig(pluginsConf);
        });
};


/**
 * Restarts all active plugins on the board
 * @returns {Q.Promise}
 */
Plugins.restartAllActivePlugins = function () {

    return pluginsState._readGlobalPluginsConfig()
        .then(function (pluginsConf) {
            var pluginKeys = helpers.objectKeys(pluginsConf.plugins);

            logger.info('Number of plugins: ' + pluginKeys.length);

            var restartingPluginsPromises = [];

            for (var i = 0; i < pluginKeys.length; i++) {

                var pluginName = pluginKeys[i];

                var status = pluginsConf.plugins[pluginName].status;
                var pid = pluginsConf.plugins[pluginName].pid;
                var autostart = pluginsConf.plugins[pluginName].autostart;

                logger.info("|--> " + pluginName + ': autostart < ' + autostart + ' > - status < ' + status + ' > ' + pid);

                // todo sync vs async
                if (status != shared.pluginStatusChoices.on && !autostart) {
                    logger.info("|----> Plugin " + pluginName + " with status OFF and autostart FALSE!");
                    continue;
                }

                (function (pluginName) {
                    // At the moment we set the timeout at 5 seconds between the exection
                    // of the plugins to avoid the simultaneously connection to the board ("board.connect").
                    restartingPluginsPromises.push(
                        Q.delay(7000 * restartingPluginsPromises.length)  // todo timeout hardcoded
                            .then(function() {
                                return Plugins.kill(pluginName);
                            })
                            .catch(function(err) {
                                if (err instanceof NoopError) {
                                    // already stopped plugin is not a failure
                                    return;
                                }
                                throw err;
                            })
                            .then(function () {
                                // todo ?? handle absent config file
                                return pluginsState._readPluginConfig(pluginName);
                            })
                            .then(function (pluginConf) {
                                return Plugins.startAsynchronousPlugin(pluginName, pluginConf);
                            })
                    );
                })(pluginName);
            }

            return Q.all(restartingPluginsPromises);
        });
};
