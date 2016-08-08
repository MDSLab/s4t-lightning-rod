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
var helpers = require('../../utils/helpers');

var RunningPluginsTracker = require('./running-tracker');


/**
 * Extends RunningPluginsTracker with periodical tickFunc which is called
 * periodically when there are any plugins to watch.
 *
 * @param tickFunc function()
 * @param periodMs
 * @constructor
 */
function PeriodicalWatchdogRunningPluginsTracker(tickFunc, periodMs) {
    this._intervalId = null;

    this._tickFunc = tickFunc;
    this._periodMs = periodMs;
}
util.inherits(PeriodicalWatchdogRunningPluginsTracker, RunningPluginsTracker);


/**
 * Starts or stops an interval
 * @private
 */
PeriodicalWatchdogRunningPluginsTracker.prototype._checkInterval = function () {
    var hasPlugins = helpers.objectKeys(this._runningPlugins).length > 0;

    if (hasPlugins && this._intervalId === null) {
        this._intervalId = setInterval(this._tickFunc, this._periodMs);
    }
    if (!hasPlugins && this._intervalId !== null) {
        clearInterval(this._intervalId);
        this._intervalId = null;
    }
};


PeriodicalWatchdogRunningPluginsTracker.prototype.add = function (pluginName,
                                                                  wrapperProcess, isSync) {
    try {
        return this.constructor.super_.prototype.add.call(this, pluginName, wrapperProcess, isSync);
    }
    finally {
        this._checkInterval();
    }
};


PeriodicalWatchdogRunningPluginsTracker.prototype.kill = function (pluginName, signal) {
    try {
        return this.constructor.super_.prototype.kill.call(this, pluginName, signal);
    }
    finally {
        this._checkInterval();
    }
};

module.exports = PeriodicalWatchdogRunningPluginsTracker;
