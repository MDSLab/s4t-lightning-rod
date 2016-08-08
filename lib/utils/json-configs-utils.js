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


var exports = module.exports = {};


/**
 * Returns bool for the `boolOrString` which can possibly be a stringified bool.
 *
 * i.e.
 * fixBoolFromString("true") === true
 * fixBoolFromString("false") === false
 *
 * @param boolOrString
 * @returns {boolean}
 */
exports.fixBoolFromString = function (boolOrString) {
    if (typeof autostart === 'string') {
        boolOrString = JSON.parse(boolOrString);
    }

    return !!boolOrString;
};


/**
 * Returns object serialized to a pretty JSON
 *
 * @param obj
 * @returns {string}
 */
exports.prettyJsonStringify = function (obj) {
    return JSON.stringify(obj, null, 4);
};
