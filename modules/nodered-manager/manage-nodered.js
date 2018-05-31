//############################################################################################
//##
//# Copyright (C) 2018 Nicola Peditto
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

var requestify = require('requestify');

RED = require("node-red");
var Q = require("q");
var fs = require("fs");

server = null;

var NODE_RED_HOME = process.env.IOTRONIC_HOME + '/.node-red';


exports.init = function (settings){

    var d = Q.defer();

    logger.info("[NODE-RED] - Init...");

    if(settings.disableEditor){

        d.resolve( RED.init(false, settings) )

    }
    else{

        var http = require('http');
        var express = require("express");

        // Create an Express app
        var app = express();

        // Add a simple route for static content served from 'public'
        app.use("/",express.static("public"));

        // Create a server
        server = http.createServer(app);

        // Initialise the runtime with a server and settings
        RED.init(server, settings);

        // Serve the editor UI from /red
        app.use(settings.httpAdminRoot, RED.httpAdmin);

        // Serve the http nodes UI from /api
        app.use(settings.httpNodeRoot, RED.httpNode);

        d.resolve(server.listen(8000))
    }

    return d.promise;


};


exports.start = function (){

    logger.info("[NODE-RED] - Starting...");

    var d = Q.defer();

    var response = {
        message: '',
        result: ''
    };
    
    // Create the settings object - see default settings.js file for other options
    var settings = {

        httpAdminRoot: "/red",
        httpNodeRoot: "/",
        disableEditor: false,
        userDir: NODE_RED_HOME,  //"/root/.node-red/",
        nodesDir: NODE_RED_HOME+"/nodes/", //"/root/.node-red/nodes/",
        //uiHost:"0.0.0.0",
        //uiPort:"1880",
        //functionGlobalContext: { },    // enables global context
        /**/
        adminAuth: {
            type: "credentials",
            users: [{
                username: "admin",
                password: "$2a$08$0tcdIPRESSKHCZqlIEjer.zDl7lJiGxeQmsmkbpcHmmMAg5yx0PEm",
                permissions: "*"
            }]
        }

    };

    exports.init(settings).then(
        function(){

            logger.info("[NODE-RED] - Init completed.");
            // Start the runtime
            RED.start().then(

                function () {

                        logger.info("[NODE-RED] - Started.");
                        response.message = "Node-RED: init and started!";
                        response.result = "SUCCESS";
                        d.resolve(response);

                    }
                )


        }
    );





    return d.promise;

};


exports.stop = function (){

    logger.info("[NODE-RED] - Stopping");
    
    var d = Q.defer();

    var response = {
        message: '',
        result: ''
    };

    // Stop the runtime
    RED.stop().then(
        function () {

            if(server != null)
                server.close(); //close the server

            logger.info("[NODE-RED] - Stopped");

            response.message = "Node-RED stopped!";
            response.result = "SUCCESS";
            d.resolve(response);
        }

    );

    return d.promise;

};


exports.getFlows = function (){

    logger.info("[NODE-RED] - Getting Node-RED flows");

    var d = Q.defer();

    var response = {
        message: '',
        result: ''
    };

    requestify.get('http://localhost:1880/flows').then( function(response) {

        var flows = response.getBody();

        response.message = flows;
        response.result = "SUCCESS";

        d.resolve(response);

    });


    return d.promise;

};


//This function Inits the Node-RED Manager
exports.Init = function (session){

    //Register all the module functions as WAMP RPCs
    session.register('s4t.'+ boardCode+'.nodered.start', exports.start);
    session.register('s4t.'+ boardCode+'.nodered.stop', exports.stop);

    session.register('s4t.'+ boardCode+'.nodered.getFlows', exports.getFlows);


    logger.info('[WAMP-EXPORTS] Node-RED methods exported to the cloud!');

};


//This function executes procedures at boot time (no Iotronic dependent)
exports.Boot = function (){

    logger.info('[BOOT] - Node-RED Manager booting procedures not defined.');

};