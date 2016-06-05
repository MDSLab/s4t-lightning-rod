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


var PluginsState = require('../../shared/plugins-state');


var pluginsState = new PluginsState();


/**
 * Plugins subsystem of the plugin process singleton
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
