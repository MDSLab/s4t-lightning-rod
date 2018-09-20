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

var logger = log4js.getLogger('HealthManager');
loglevel = nconf.get('config:log:loglevel');
logger.setLevel(loglevel);

var http = require('http');

var checkHealthResponse = null;

health_rest_port = nconf.get('config:board:health:local_port');

// connectionTester: library used to check the reachability of Iotronic-Server/WAMP-Server
var connectionTester = require('connection-tester');

exports.start = function (){

    var HealthLRserver = http.createServer(function(request, response) {

        if(request.url == "/diagnostics"){

            var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
            var timestamp = (new Date(Date.now() - tzoffset)).toISOString();

            connectionTester.test(wampIP, port_wamp, 10000, function (err, output) {

                var reachable = output.success;
                var error_test = output.error;

                if (reachable) {

                    exports.sendRPCalive(function (alive_msg) {

                        try{
                            response.writeHead(200, {"Content-Type": "application/json"});

                            var health = {
                                "lr_pid": LR_PID,
                                "internet_connection": {
                                    "status": "true",
                                    "reason": error_test
                                },
                                "wamp_connection": alive_msg,
                                "board_id": boardCode,
                                "timestamp":timestamp
                            };

                            response.write(JSON.stringify(health),function(msg) { response.end(); });

                        }
                        catch (err) {
                            response.writeHead(200, {"Content-Type": "text/plain"});
                            var health = "Health Check error!";
                            response.write(JSON.stringify(health),function(msg) { response.end(); });

                        }

                    });

                }
                else{

                    response.writeHead(200, {"Content-Type": "application/json"});

                    var health = {
                        "lr_pid": LR_PID,
                        "internet_connection": {
                            "status": "false",
                            "log": error_test
                        },
                        "wamp_connection": {
                            "status": "false",
                            "reason": "No Internet connection!"
                        },
                        "board_id": boardCode,
                        "timestamp":timestamp
                    };

                    response.write(JSON.stringify(health),function(msg) { response.end(); });

                }

            });

        }
        else{

            response.writeHead(200, {"Content-Type": "text/html"});
            response.write("<!DOCTYPE 'html'>");
            response.write("<html>");
            response.write("<head>");
            response.write("<title>Lightning-rod REST server</title>");
            response.write("</head>");
            response.write("<body>");
            response.write("Lightning-rod management services:");
            response.write("<br>");
            response.write("<ul>");

            response.write("<li><a href='http://"+request.headers.host+"/diagnostics'>Diagnostics</a></li>");

            response.write("</ul>");
            response.write("</body>");
            response.write("</html>");
            response.end();

        }







    });



    HealthLRserver.listen(health_rest_port, function() {
        logger.info("[HEALTH] - Health LR server is listening on port " + health_rest_port);
    });
    
};


exports.sendRPCalive = function (callback) {

    try{

        checkHealthResponse = setTimeout(function(){

            var msg = {
                "status": "false",
                "reason": "EUNREACH"
            };

            callback(msg)

        }, 5000);



        if(RECOVERY_SESSION != undefined){

            // Test if IoTronic is connected to the realm
            RECOVERY_SESSION.call("s4t.iotronic.isAlive", [boardCode]).then(

                function(response){

                    clearTimeout(checkHealthResponse);

                    var msg = {
                        "status": "true",
                        "reason": response
                    };

                    callback(msg)

                },
                function (err) {

                    // WAMP connection is OK but I got an error on RPC communication
                    clearTimeout(checkIotronicResponse);

                    var msg = {
                        "status": "false",
                        "reason": err
                    };

                    callback(msg)

                }

            );

        }



    }
    catch (err) {

        callback("ERROR")

    }


};
