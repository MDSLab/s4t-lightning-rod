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

var DEFAULT_SETTINGS_FILEPATH = './settings.json';
var SETTINGS_ENV_NAME = 'S4T_LR_SETTINGS_FILE';

var exports = module.exports = {};

/**
 * Expose nconf
 */
exports.nconf = nconf;


function getFilePath() {
    return process.env[SETTINGS_ENV_NAME] || DEFAULT_SETTINGS_FILEPATH;
}


/**
 * Reload nconf settings
 *
 * The following configuration sources are tried (in specified order):
 *  - filename from env variable S4T_LR_SETTINGS_FILE
 *  - './settings.json'
 *
 */
exports.reload = function () {
    nconf
        .file({file: getFilePath()});
};


/**
 * Saves current nconf settings
 *
 * @returns {Q.Promise}
 */
exports.save = function () {
    return Q.Promise(function (resolve, reject) {
        nconf.save(function (err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};
