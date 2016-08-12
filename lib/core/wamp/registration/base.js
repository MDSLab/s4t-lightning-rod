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

/**
 * Base abstract class for WAMP procedure registration,
 * required to unregister it later.
 *
 * @constructor
 * @abstract
 */
function BaseWAMPRegistration() {
    if (this.constructor === BaseWAMPRegistration) {
        throw new Error("Can't instantiate abstract class!");
    }

}


module.exports = BaseWAMPRegistration;
