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

var fspromised = require('./../utils/fspromised');
var ConfigError = require('./../utils/config-error');
var logger = require('./../utils/log4js-wrapper').getLogger("Plugins");
var helpers = require('./../utils/helpers');


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
PluginsState.prototype.getPluginPathByName = function (pluginName) {
    return this._pluginsUploadDir + pluginName + ".js";
};

/**
 * Returns target path to the pluginName's own config
 * @param pluginName
 * @returns {string}
 */
PluginsState.prototype.getPluginConfPathByName = function (pluginName) {
    return this._pluginsConfDir + pluginName + ".js";
};


/**
 * Reads global plugins config file
 * @returns {Q.Promise}
 */
PluginsState.prototype.readGlobalPluginsConfig = function () {
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
PluginsState.prototype.writeGlobalPluginsConfig = function (pluginsConf) {
    return fspromised.writeFile(this._globalPluginsConfigFilepath, JSON.stringify(pluginsConf, null, 4));
};


/**
 * Reads plugin's own config file
 * @param pluginName
 * @returns {Q.Promise}
 */
PluginsState.prototype.readPluginConfig = function (pluginName) {
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
PluginsState.prototype.writePluginConfig = function (pluginName, pluginConf) {
    return fspromised.writeFile(this._getPluginConfPathByName(pluginName), JSON.stringify(pluginConf, null, 4));
};


module.exports = PluginsState;