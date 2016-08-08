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


var objectProto = Object.prototype;


/**
 * Returns object's own keys. Used as a
 * fallback function when Object.keys is absent.
 *
 * @param obj
 * @returns {Array}
 */
exports.fallbackObjectKeys = function (obj) {
    var keys = [];
    for (var key in obj) {
        if (objectProto.hasOwnProperty.call(obj, key)) {
            keys.push(key);
        }
    }
    return keys;
};


/**
 * Returns object's own keys
 *
 * @param obj
 * @returns {Array}
 */
exports.objectKeys = Object.keys || exports.fallbackObjectKeys;


/**
 * Tells whether that object is an array. Used as a
 * fallback function when Array.isArray is absent.
 *
 * @param obj
 * @returns {boolean}
 */
exports.fallbackIsArray = function (obj) {
    return objectProto.toString.call(obj) === '[object Array]';
};


/**
 * Tells whether that object is an array
 *
 * @param obj
 * @returns {boolean}
 */
exports.isArray = Array.isArray || exports.fallbackIsArray;

/**
 * Returns a shallow copy of an object
 * @param obj
 */
exports.clone = function (obj) {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }

    var copy;

    if (exports.isArray(obj)) {
        var len = obj.length;
        copy = new Array(len);
        for (var i = 0; i < len; i++) {
            copy[i] = obj[i];
        }
    } else {
        var keys = exports.objectKeys(obj);

        copy = {};

        for (var j = 0; j < keys.length; j++) {
            var key = keys[j];

            copy[key] = obj[key];
        }
    }
    return copy;
};


/**
 * Polyfill Object.assign
 *
 * @param target
 * @param source
 * @return {{}}
 */
exports.fallbackObjectAssign = function(target, source) {  // eslint-disable-line no-unused-vars
    if (target === null || target === undefined) {
        throw new TypeError('Object.assign cannot be called with null or undefined');
    }

    var result = Object(target);

    for (var s = 1; s < arguments.length; s++) {
        var from = Object(arguments[s]);

        for (var key in from) {
            if (objectProto.hasOwnProperty.call(from, key)) {
                result[key] = from[key];
            }
        }
    }

    return result;
};


/**
 * Copies keys and their values from all objects to the `target`
 *
 * @param target
 * @returns {{}}
 */
exports.objectAssign = Object.assign || exports.fallbackObjectAssign;
