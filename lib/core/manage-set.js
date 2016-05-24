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

var logger = require('./../utils/log4js-wrapper').getLogger("ManageSet");
var helpers = require('../utils/helpers');

/**
 * List of `manage` modules to register on the WAMP session
 * @type {string[]}
 */
var manageList = [
    "board-command",
    "networks",
    "pins",
    "pugins",
    "set-board-position"
];


// create the list of corresponding modules for the manageList
var manageModules = [];
for (var i = 0; i < manageList.length; i++) {
    manageModules.push(require('./manage/' + manageList[i]));
}

/**
 * ManageSet singleton
 * @type {{}}
 */
var ManageSet = module.exports = {};


/**
 * Exports procedures and subscribes to topics for the session for each manage module
 * @param session {BaseWAMPSession}
 */
ManageSet.exportAll = function (session) {

    for (var i = 0; i < manageModules.length; i++) {
        manageModules[i](session);
    }

    logger.info('[WAMP-EXPORTS] Management commands exported to the cloud!');
};
