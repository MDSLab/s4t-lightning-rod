/*
The MIT License (MIT)
Copyright (c) 2014 Andrea Rocco Lotronto
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
var wts = require("node-reverse-wstunnel");
var autobahn = require('autobahn');

var os = require('os');
var ifaces = os.networkInterfaces();

var url_wamp_router = "ws://212.189.207.109:8181/ws";
var url_reverse_server = "ws://212.189.207.109:8080";

var connection = new autobahn.Connection({
	url: url_wamp_router,
	realm: "s4t"
});

//var linino = require('ideino-linino-lib');
//var board = new linino.Board();

var gpio = require("pi-gpio");

var topic_command = 'board.command';
var topic_connection = 'board.connection';

var getIP = require('./lib/getIP.js');
var IPLocal = '127.0.0.1';//getIP('eth0', 'IPv4');


connection.onopen = function (session, details) {

   //Define a RPC to Read Data from PIN
   function readDigital(args){
      value = gpio.readSync(args[2]);
      return value;
   }

   function writeDigital(args){
      gpio.setDirection(args[2],'out');
      gpio.write(args[2],parseInt(args[3]));
      return 0;
   }
   

   //Register a RPC for remoting
   session.register(os.hostname()+'.command.rpc.read.digital', readDigital);
   session.register(os.hostname()+'.command.rpc.write.digital', writeDigital);
   //session.register(os.hostname()+'.command.rpc.read.analog', readAnalog);

   // Publish, Subscribe, Call and Register
   console.log("Connected to WAMP router: "+url_wamp_router);
   
   //Registro la scheda pubblicando su un topic
   console.log("Send my ID on topic: "+topic_connection);

   session.publish(topic_connection, [os.hostname(), 'connection']);

   //Gestione chiusura comunicazione al server
   process.on('SIGINT', function(){
      session.publish(topic_connection, [os.hostname(), 'disconnect']);
      process.exit();
   });

   //Gestisco topic per i comandi
   var onCommandMessage = function (args){
      console.log('Receive:::'+args[0]);

      if(args[0]==os.hostname()){
         switch(args[1]){
            case 'ssh':
               //DEBUG
               console.log("Start REVERSE for ssh");
               
               var reverse_client_ssh = new wts.client_reverse;
               
               //DEBUG
               console.log(typeof(reverse_client_ssh));
               console.log(args[2]+','+url_reverse_server+','+IPLocal+':22')
               
               reverse_client_ssh.start(args[2], url_reverse_server, IPLocal+':22');
               break;

            case 'mode':
               //DEBUG Message
               console.log('Set PIN MODE');
               console.log('message::::'+args);
               gpio.open(args[2]);
               //board.pinMode(args[2],args[3]);
               gpio.setDirection(args[2],args[3]);
               break;
           /*
            case 'digital':
                if(args[3]!= undefined){
                  //DEBUG Message
                  console.log('DIGITAL WRITE');
                  console.log('message::::'+args);
                  //board.digitalWrite(args[2],parseInt(args[3]));
                  gpio.write(args[2],parseInt(args[3]));
                  break;
                }
            */
         }
      }
   }

   session.subscribe(topic_command, onCommandMessage);
};

connection.onclose = function (reason, details) {
   // handle connection lost  
}

connection.open();
