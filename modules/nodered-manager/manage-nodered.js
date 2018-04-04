//############################################################################################
//##
//# Copyright (C) 2014-2017 Dario Bruneo, Francesco Longo, Giovanni Merlino, Nicola Peditto
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


//service logging configuration: "pluginsManager"
var logger = log4js.getLogger('noderedManager');
logger.setLevel(loglevel);

var RED = require("node-red");


// RPC to execute a syncronous plugin ("call" as the exection of a command that returns a value to the "caller"): it is called by Iotronic via RPC
exports.init = function (args, details){


};



//This function exports all the functions in the module as WAMP remote procedure calls
exports.exportCommands = function (session){

    //Register all the module functions as WAMP RPCs
    //session.register('s4t.'+ boardCode+'.nodered.run', exports.init);
    
    logger.info('[WAMP-EXPORTS] Plugin commands exported to the cloud!');

};

