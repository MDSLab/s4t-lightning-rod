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

var lsof = require('lsof');

var args = process.argv.slice(2);
LR_PID = args[0];
port_wamp = args[1];

gdb_error = false;

lsof.rawTcpPort(port_wamp, function(data) { //
    
    //lsof -i -P -n |grep node | grep 8181| awk '{print $4}'


    for (var i = 0; i < data.length; i++) {

        (function (i) {

            if(data[i].pid == LR_PID){

                try{

                    LR_FD = data[i].fd;

                    var spawn = require('child_process').spawn;
                    var gdb = spawn('gdb', ['-p', LR_PID]);

                    gdb.stdin.setEncoding('utf-8');

                    gdb.on('error', function(err) {
                        gdb_error = true;
                        process.send({result: "ERROR", message: "spawning GDB error: " + err});
                    });

                }
                catch(err){
                    process.send({result: "ERROR", message: "starting GDB error: " + err});
                }


                setTimeout(function() {

                    if(!gdb_error){

                        try{
                            gdb.stdin.write('call shutdown('+LR_FD+',0)\nquit\ny\n');
                            gdb.stdin.end();
                            process.send({result: "SUCCESS", message: "socket [FD: " +LR_FD+"] on port "+port_wamp+" closed!"});

                        }
                        catch(err){
                            process.send({result: "ERROR", message: "socket closing error: " + err});
                        }

                    }

                }, 1000);
                

            }



        })(i);

    }


    /*
    try{

        LR_FD = data[0].fd;
    
        var spawn = require('child_process').spawn;
        var gdb = spawn('gdb', ['-p', LR_PID]);
    
        gdb.stdin.setEncoding('utf-8');
        //gdb.stdout.pipe(process.stdout);

        gdb.on('error', function(err) {
            gdb_error = true;
            process.send({result: "ERROR", message: "spawning GDB error: " + err});
        });

    }
    catch(err){
        process.send({result: "ERROR", message: "starting GDB error: " + err});
    }


    setTimeout(function() {

        if(!gdb_error){

            try{
                gdb.stdin.write('call shutdown('+LR_FD+',0)\nquit\ny\n');
                gdb.stdin.end();
                process.send({result: "SUCCESS", message: "socket [FD: " +LR_FD+"] on port "+port_wamp+" closed!"});
            }
            catch(err){
                process.send({result: "ERROR", message: "socket closing error: " + err});
            }

        }
        
    }, 1000);

    */


});


process.on('exit', function(){

    process.send({result: "SUCCESS", message: "EXIT"});
    
});



