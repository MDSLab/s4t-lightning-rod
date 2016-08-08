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


var path = require('path');

var log4jsWrapper = require('../utils/log4js-wrapper');
var nconfWrapper = require('../utils/nconf-wrapper');

var Board = require('./plugin/board');
var Plugins = require('./plugin/plugins');

var processUtils = require('./utils/utils');
var constants = require('../shared/constants/plugin');
var BaseAsyncPlugin = require('./../pluginapi/baseasync');
var BaseSyncPlugin = require('./../pluginapi/basesync');
var PatchPluginRequire = require('./plugin/patch-require');

var logger = log4jsWrapper.getLogger("plugin");
var nconf = nconfWrapper.nconf;


nconfWrapper.reload();
log4jsWrapper.reload(nconf);

var patchPluginRequire = new PatchPluginRequire(path.join(__dirname, '..', 'pluginapi'));


function PluginWrapper(pluginName, pluginConf, pluginIsSync) {
    this.pluginName = pluginName;
    this.pluginConf = pluginConf;
    this.pluginIsSync = pluginIsSync;

    this._pluginInstance = null;
}

PluginWrapper.prototype.message = function (payload, status) {
    return {name: this.pluginName, status: status, payload: payload};
};

PluginWrapper.prototype.run = function () {
    var pluginModule;
    try {
        patchPluginRequire.patch();
        // eslint-disable-next-line global-require
        pluginModule = require('./plugins/' + this.pluginName);
    }
    catch (e) {
        logger.warn("failed to load plugin module: " + e);

        throw e;
    }
    finally {
        patchPluginRequire.unpatch();
    }

    //process.send(this.message("I'm alive!", choices.messageStatusChoices.log));
    process.send(this.message("starting...", constants.messageStatus.log));
    process.send(this.message("I'm alive!", constants.messageStatus.alive));

    if (!(pluginModule instanceof (this.pluginIsSync ? BaseSyncPlugin : BaseAsyncPlugin))) {
        var reason = "Plugin module is of the wrong type!";
        process.send(this.message(reason, constants.messageStatus.badtype));
        throw new Error(reason);
    }

    this._pluginInstance = new pluginModule(this.pluginConf);

    if (this.pluginIsSync) {
        this._pluginInstance.call()
            .then(function (result) {
                process.send(this.message(result, constants.messageStatus.finish));

                // todo is it really required here?
                process.exit(0);  // eslint-disable-line no-process-exit
            }.bind(this))
            .done();
    } else {
        this._pluginInstance.start();
    }
};

PluginWrapper.prototype.exit = function () {

    if (this._pluginInstance) {
        if (this.pluginIsSync) {
            this._pluginInstance.cleanup();
        } else {
            this._pluginInstance.stop();
        }
    }

    var pluginsConf = Plugins.getState().readGlobalPluginsConfigSync();
    pluginsConf.plugins[this.pluginName].status = constants.pluginStatus.off;
    pluginsConf.plugins[this.pluginName].pid = "";
    Plugins.getState().writeGlobalPluginsConfigSync(pluginsConf);
};

var pluginWrapper;


processUtils.setupCleanupCallback(function (code) {
    logger.info("Exiting with error code " + code);

    if (pluginWrapper) {
        pluginWrapper.exit();
    }
});


Board.getState().reload();
Plugins.getState().reload();
//  todo catch ConfigError


process.once('message', function (message) {
    var pluginName = message.pluginName;
    var pluginConf = message.pluginConf;
    var pluginIsSync = message.pluginIsSync;

    pluginWrapper = new PluginWrapper(pluginName, pluginConf, pluginIsSync);

    Board.getState().getDevice().init()
        .then(function () {
            pluginWrapper.run();
        })
        .done();
});
