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

var fs = require('fs');
var Q = require('q');


/**
 * fs module functions wrapped with promises
 */
var exports = module.exports = {};


/**
 * fs.readFile
 * @param filePath
 * @param options 'utf8' by default
 * @returns {Q.Promise}
 */
exports.readFile = function (filePath, options) {
    options = options || 'utf8';

    return Q.Promise(function (resolve, reject) {
        fs.readFile(filePath, options, function (err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
};


/**
 * fs.writeFile
 * @param filePath
 * @param data
 * @returns {Q.Promise}
 */
exports.writeFile = function (filePath, data) {
    return Q.Promise(function (resolve, reject) {
        fs.writeFile(filePath, data, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};


/**
 * fs.unlink
 * @param filePath
 * @returns {Q.Promise}
 */
exports.unlink = function (filePath) {
    return Q.Promise(function (resolve, reject) {
        fs.unlink(filePath, function (err) {
            if (err) {
                //if (err.code === 'ENOENT') {
                //}

                reject(err);
            } else {
                resolve();
            }
        });
    });
};


/**
 * fs.readdir
 * @param path
 * @returns {Q.Promise}
 */
exports.readdir = function (path) {
    return Q.Promise(function (resolve, reject) {
        fs.readdir(path, function (err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
};


/*
* fs.stat
* @param path
* @returns {Q.Promise}
*/
exports.stat = function (path) {
    return Q.Promise(function (resolve, reject) {
        fs.stat(path, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};


/**
 * fs.mkdir
 * @param path
 * @param mode
 * @returns {Q.Promise}
 */
exports.mkdir = function (path, mode) {
    return Q.Promise(function (resolve, reject) {
        fs.mkdir(path, mode, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};
