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


var boardState = require('./_state');


/**
 * Board subsystem singleton
 */
var Board = module.exports = {};

/**
 * Returns BoardState
 *
 * @returns {BoardState}
 */
Board.getState = function () {
    return boardState;
};
