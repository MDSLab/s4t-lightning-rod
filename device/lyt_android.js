//############################################################################################
//##
//# Copyright (C) 2017 Nicola Peditto
//##
//# Licensed under the Apache License, Version 2.0 (the "License");
//# you may not use this file except in compliance with the License.
//# You may obtain a copy of the License at
//##
//# http://www.apache.org/licenses/LICENSE-2.0
//##
//# Unless required by applicable law or agreed to in writing, software
//# distributed under the License is distributed on an "AS IS" BASIS,
//# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//# See the License for the specific language governing permissions and
//# limitations under the License.
//##
//############################################################################################


var util = require('util');

var Device = require('./Device');

function AndroidDevice(name) {

    Device.call(this);

    this.name = name;

}

util.inherits(AndroidDevice, Device);


var response = {
    message: '',
    result: ''
};

AndroidDevice.prototype.Main = function (wampConnection, logger) {

    // CONNECTION TO WAMP SERVER --------------------------------------------------------------------------
    logger.info('[WAMP] - Opening connection to WAMP server...');
    wampConnection.open();
    //-----------------------------------------------------------------------------------------------------

    // PLUGINS RESTART ALL --------------------------------------------------------------------------------
    //This procedure restarts all plugins in "ON" status
    var managePlugins = require('../modules/plugins-manager/manage-plugins');
    managePlugins.pluginsLoader();
    //-----------------------------------------------------------------------------------------------------

};






AndroidDevice.prototype.readDigital = function(args, callback) {
    response.message = "Not implemented";
    response.result = "ERROR";
    logger.info("[GPIO] - readDigital: " + response.message);
    callback(response);

};


AndroidDevice.prototype.readAnalog = function(args, callback) {
    response.message = "Not implemented";
    response.result = "ERROR";
    logger.info("[GPIO] - readAnalog: " + response.message);
    callback(response);

};


AndroidDevice.prototype.writeAnalog = function(args, callback) {
    response.message = "Not implemented";
    response.result = "ERROR";
    logger.info("[GPIO] - writeAnalog: " + response.message);
    callback(response);

};


AndroidDevice.prototype.writeDigital = function(args, callback) {
    response.message = "Not implemented";
    response.result = "ERROR";
    logger.info("[GPIO] - writeDigital: " + response.message);
    callback(response);

};


AndroidDevice.prototype.setMode = function(args, callback) {
    response.message = "Not implemented";
    response.result = "ERROR";
    logger.info("[GPIO] - setMode: " + response.message);
    callback(response);

};


module.exports = AndroidDevice;