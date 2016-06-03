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


var pluginStatusChoices = {
    on: "on",
    off: "off",
    injected: "injected"
};

var messageStatusChoices = {
    alive: "alive",
    finish: "finish",  // sync plugin result
    log: "log"
};

module.exports = {
    pluginStatusChoices: pluginStatusChoices,
    messageStatusChoices: messageStatusChoices
};