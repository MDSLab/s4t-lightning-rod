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

var logger = require('../../utils/log4js-wrapper').getLogger("Plugins");

var PluginsState = require('../../shared/plugins-state');
var PeriodicalWatchdogRunningPluginsTracker = require('../plugins/watchdog-running-tracker');


var pluginsState = module.exports = new CorePluginsState();

/**
 * Extends PluginsState with a running plugins tracker
 *
 * @constructor
 */
function CorePluginsState() {
    PluginsState.call(this);

    /**
     * The purpose of this class is to consistently keep track of processes
     * started by current LR Core process.
     *
     * Since plugins.json statuses and pids might be edited outside, we need
     * to keep a reliable list of processes we started by ourselves and
     * (eventually) sync it with the file.
     *
     * Without that we wouldn't have been able to stop processes started
     * here and switched to 'off' outside.
     *
     * Moreover, we need to determine sometimes whether we have started
     * the plugin or not in order to reject/redo the requested operation.
     *
     * @type {RunningPluginsTracker}
     */
    this._runningPluginsTracker =  // previously was 300 * 1000
        new PeriodicalWatchdogRunningPluginsTracker(pluginsWatchdogTick, 60 * 1000);


    /**
     * This function is called when a plugin needs to be restarted
     * @param pluginName
     */
    this.onPluginRestartIsNeeded = function (pluginName) {};  // eslint-disable-line no-unused-vars

}
util.inherits(CorePluginsState, PluginsState);


function pluginsWatchdogTick() {
    pluginsState._runningPluginsTracker.each(function (pluginName, runningPlugin) {
        if (runningPlugin.isRunning()) {
            return;
        }

        if (runningPlugin.isSync) {  // we should watch for async plugins only
            return;
        }

        logger.warn('[PLUGIN] - PluginChecker - ' + pluginName
            + ' - No such process found - Restarting...');

        pluginsState.onPluginRestartIsNeeded(pluginName);
    });
}

