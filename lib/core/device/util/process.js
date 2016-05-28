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
 * Represents a system process item
 *
 * @constructor
 */
function Process(pid, command, args, parentPid) {
    this.pid = pid;
    this.command = command;
    this.args = args;
    this.parentPid = parentPid;
}

/**
 * Returns true if that command file is at `path`
 *
 * @param path
 * @returns {boolean}
 */
Process.prototype.isCommandFileEquals = function (path) {
    // todo is it a good way to do this?

    var minLength = Math.min(path.length, this.command.length);
    if (minLength <= 0)
        return false;

    if (path.substr(-minLength).toLowerCase() === this.command.substr(-minLength).toLowerCase())
        return true;

    return false;
};

/**
 * Returns true is that command args contain args from `parts`
 * sequentially in the args list. Item (part) may be the string or the RegExp.
 *
 * For example, ['-a', /haha$/] will match for args list: ['-foo', 'bar', '-a', 'ahaha', '--z'],
 * but won't match for  ['-foo', 'bar', '-a', '--z', 'ahaha'] (because of the '--z' between the '-a' and the 'ahaha')
 *
 * @throws {Error} if `parts` is empty
 * @param parts list of args
 * @returns {boolean}
 */
Process.prototype.argsContain = function (parts) {
    if (!parts || parts.length <= 0)
        throw new Error("parts cannot be empty");

    for (var startPos = 0; startPos <= this.args.length - parts.length; startPos++) {
        var ok = true;
        for (var i = 0; i < parts.length; i++) {
            var a = this.args[startPos + i];
            var p = parts[i];

            if (p instanceof RegExp) {
                if (!p.test(a)) {
                    ok = false;
                    break;
                }
            } else {
                if (p != a) {
                    ok = false;
                    break;
                }
            }
        }
        if (ok)
            return true;
    }
    return false;
};


module.exports = Process;