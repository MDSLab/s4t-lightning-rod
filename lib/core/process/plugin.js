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


var fs = require("fs");

var log4jsWrapper = require('../../utils/log4js-wrapper');
var nconfWrapper = require('../../utils/nconf-wrapper');

var Board = require('../board');

var processUtils = require('./utils/utils');
var shared = require('./shared/plugin');
var BaseAsyncPlugin = require('./plugin/baseasync');
var BaseSyncPlugin = require('./plugin/basesync');

var logger = log4jsWrapper.getLogger("plugin");
var nconf = nconfWrapper.nconf;


nconfWrapper.reload();
log4jsWrapper.reload(nconf);

Board.getState().reload();
// todo catch ConfigError


function PluginWrapper(pluginName, pluginConf, pluginIsSync) {
    this.pluginName = pluginName;
    this.pluginConf = pluginConf;
    this.pluginIsSync = pluginIsSync;

    this._pluginInstance = null;
}

PluginWrapper.prototype.message = function (payload, status) {
    return {name: this.pluginName, status: status, payload: payload}
};

PluginWrapper.prototype.run = function () {
    var pluginModule;
    try {
        pluginModule = require('./plugins/' + pluginName);
    }
    catch (e) {
        logger.warn("failed to load plugin module: " + e);

        throw e;
        // todo exit gracefully https://nodejs.org/api/process.html#process_process_exit_code
        //process.exit(1);
    }

    //process.send(this.message("I'm alive!", shared.messageStatusChoices.log));
    process.send(this.message("starting...", shared.messageStatusChoices.log));
    process.send(this.message("I'm alive!", shared.messageStatusChoices.alive));

    if (!(pluginModule instanceof (this.pluginIsSync ? BaseSyncPlugin : BaseAsyncPlugin))) {
        throw new Error("Plugin module is of the wrong type!");
    }

    this._pluginInstance = new pluginModule(this.pluginConf);

    if (this.pluginIsSync) {
        this._pluginInstance.call()
            .then(function(result) {
                process.send(this.message(result, shared.messageStatusChoices.finish));
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

    //console.log('Process terminated: putting ' + plugin_name + ' to off');

    /*
     try {
     var pluginsConf = JSON.parse(fs.readFileSync('./plugins.json', 'utf8'));
     }
     catch (err) {
     //console.log('Error parsing JSON file ./plugins.json');
     process.send(this.message('Error parsing JSON file ./plugins.json: ' + err, "error"));
     }


     pluginsConf.plugins[this.pluginName].status = "off";
     pluginsConf.plugins[this.pluginName].pid = "";


     //updates the JSON file
     var outputFilename = './plugins.json';
     fs.writeFileSync(outputFilename, JSON.stringify(pluginsConf, null, 4));
     */
};

var pluginWrapper;

process.once('message', function (message) {
    var pluginName = message.pluginName;
    var pluginConf = message.pluginConf;
    var pluginIsSync = message.pluginIsSync;

    pluginWrapper = new PluginWrapper(pluginName, pluginConf, pluginIsSync);

    // todo pass exceptions to the parent

    Board.getState().getDevice().init()
        .then(function () {
            pluginWrapper.run();
        })
        .done();
});



processUtils.setupCleanupCallback(function (code) {
    logger.info("Exiting with error code " + code);

    if (pluginWrapper)
        pluginWrapper.exit();
});
