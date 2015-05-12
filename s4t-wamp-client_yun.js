var wts = require("node-reverse-wstunnel");
var autobahn = require('autobahn');
var spawn = require('child_process').spawn;


var os = require('os');
var ifaces = os.networkInterfaces();

//Load configuration file
var nconf = require('nconf');
nconf.file ({file: 'setting.json'});

var basePort = nconf.get('config:socat:client:port');
var wampR_url = nconf.get('config:wamp:url')+":"+nconf.get('config:wamp:port')+"/ws";
var reverseS_url = nconf.get('config:reverse:url')+":"+nconf.get('config:reverse:port');
var wamp_realm = nconf.get('config:wamp:realm');

console.log(wampR_url);
console.log(reverseS_url);
console.log(wamp_realm);
var connection = new autobahn.Connection({
	url: wampR_url,
	realm: wamp_realm
});

var linino = require('ideino-linino-lib');
var board = new linino.Board();

var topic_command = 'board.command';
var topic_connection = 'board.connection';

var getIP = require('./lib/getIP.js'); //in this moment is not used
var IPLocal = '127.0.0.1';//getIP('eth0', 'IPv4');


//As first step we need to use the function 'connect' of the object 'linino.Board()'' 
board.connect( function(){
   //After the connection is ready we can use the ideino-linino-lib to controll the PIN
   //of the board

   connection.onopen = function (session, details) {

      //Define a RPC to Read Data from PIN
      function readDigital(args){
         //if(layout.digital.hasOwnProperty(args[2])){
         try{
            value = board.digitalRead(args[2]);
            return value;
         }catch(ex){
         //else{
            return ex.message;
         }
         
      }

      //Define a RPC to Write Data from PIN
      function writeDigital(args){
         //if(layout.digital.hasOwnProperty(args[2])){
         //   board.pinMode(args[2],'output');
         try{
            board.digitalWrite(args[2],parseInt(args[3]));
            return 0;
         }catch(ex){
         //else{
            return ex.message;
         }
      }
      //Define a RPC to Read Data from PIN
      function readAnalog(args){
         //if(layout.analog.hasOwnProperty(args[2])){
         try{
            value = board.analogRead(args[2]);
            return value;
         }catch(ex){
         //else{
            return ex.message;
         }
      }

      //Define a RPC to Write Data to analog PIN
      function writeAnalog(args){
         try{
            board.analogWrite(args[2],parseInt(args[3]));
            return 0;   
         }catch(ex){
            return ex.message;
         }
         
      }

      //Define a RPC to Set mode of the PIN
      function setMode(args){
         //if(layout.digital.hasOwnProperty(args[0])){
            //if(args[1] === 'input' || args[1] ==='output'){
            try{
               board.pinMode(args[0],args[1]);
               return 0;   
            
            }catch(ex){
         //else{
            return ex.message;
         }
      }

      //Register a RPC for remoting
      session.register(os.hostname()+'.command.rpc.setmode', setMode);

      session.register(os.hostname()+'.command.rpc.read.digital', readDigital);
      session.register(os.hostname()+'.command.rpc.write.digital', writeDigital);

      session.register(os.hostname()+'.command.rpc.read.analog', readAnalog);
      session.register(os.hostname()+'.command.rpc.write.analog', writeAnalog);

      // Publish, Subscribe, Call and Register
      console.log("Connected to WAMP router: "+wampR_url);
      
      //Registro la scheda pubblicando su un topic
      console.log("Send my ID on topic: "+topic_connection);

      session.publish(topic_connection, [os.hostname(), 'connection']);

      //Gestione chiusura comunicazione al server
      process.on('SIGINT', function(){
         session.publish(topic_connection, [os.hostname(), 'disconnect']);
         process.exit();
      });

      process.on('SIGTERM', function(){
         session.publish(topic_connection, [os.hostname(), 'disconnect']);
         process.exit();
      });

      //Gestisco topic per i comandi
      var onCommandMessage = function (args){
         console.log('Receive:::'+args[0]);
         console.log('')

         if(args[0]==os.hostname()){
            switch(args[1]){
               case 'tty':
                  //DEBUG
                  console.log("Start REVERSE for tty.js");
                  
                  var reverse_client_ssh = new wts.client_reverse;
                  
                  //DEBUG
                  console.log(typeof(reverse_client_ssh));
                  console.log(args[2]+','+reverseS_url+','+IPLocal+':2230')
                  
                  reverse_client_ssh.start(args[2], reverseS_url, IPLocal+':2230');
                  break;
               case 'ssh':
                  //DEBUG
                  console.log("Start REVERSE for ssh");
                  
                  var reverse_client_ssh = new wts.client_reverse;
                  
                  //DEBUG
                  console.log(typeof(reverse_client_ssh));
                  console.log(args[2]+','+reverseS_url+','+IPLocal+':22')
                  
                  reverse_client_ssh.start(args[2], reverseS_url, IPLocal+':22');
                  break;
               case 'ideino':
                  //DEBUG
                  console.log("Start REVERSE for ideino");
                  
                  var reverse_client_ideino = new wts.client_reverse;
                  //DEBUG
                  console.log(typeof(reverse_client_ideino));
                  console.log(args[2]+','+reverseS_url+','+IPLocal+':2424')
                  
                  reverse_client_ideino.start(args[2], reverseS_url, IPLocal+':2424');
                  break;
               case 'osjs':
                  //DEBUG
                  console.log("Start REVERSE for osjs");               
                  var reverse_client_ideino = new wts.client_reverse;

                  //DEBUG
                  console.log(typeof(reverse_client_ideino));
                  console.log(args[2]+','+reverseS_url+','+IPLocal+':8000')
                  
                  reverse_client_ideino.start(args[2], reverseS_url, IPLocal+':8000');
                  break;
               
               case 'create-network':
                  console.log("Start configuring network topology");
                  console.log('host tunIP: ' + JSON.stringify(args[2]));
                  console.log('server tunIP: ' + JSON.stringify(args[3]));
                  console.log('server socat port: ' + JSON.stringify(args[4]));
                  console.log('host greIP: ' + JSON.stringify(args[5]));
                  console.log('broadcast gre: ' + JSON.stringify(args[6]));
                  console.log('subnet mask: ' + JSON.stringify(args[7]));
                                                                        
                  socatClient = spawn('socat', ['-d','-d','TCP-L:'+ basePort +',bind=localhost,reuseaddr,forever,interval=10','TUN:'+args[2]+'/30,tun-name=socattun,up']);
                  
                  //socatClient.on('error',function(err){throw err});
                  
                  socatClient.stdout.on('data', function (data) {
                     console.log('stdout: ' + data);
                  });
                  socatClient.stderr.on('data', function (data) {
                     var textdata = 'stderr: ' + data;
                     console.log(textdata);
                     if(textdata.indexOf("starting data transfer loop") > -1) {
                        spawn('ifconfig',['socattun','up']);

                       
                        
                        var testing = spawn('ip',['link','add','greUnime','type','gretap','remote',args[3],'local',args[2]]);                 
                        
                        testing.on('error',function(err){throw err});
                        testing.stdout.on('data', function (data) {
                           console.log('create link: ' + data);
                        });
                        testing.stderr.on('data', function (data) {
                           console.log('create link: ' + data);
                        });
                        testing.on('close', function (code) {
                           console.log('create link process exited with code ' + code);
                           
                           var testing2 = spawn('ip',['addr','add',args[5]+'/'+args[7],'broadcast',args[6],'dev','greUnime']); 
                           testing2.stdout.on('add ip: ', function (data) { 
                              console.log('stdout: ' + data); 
                           });
                           testing2.stderr.on('add ip: ', function (data) { 
                              console.log('stderr: ' + data);
                           });
                           testing2.on('close', function (code) {
                              console.log('add ip process exited with code ' + code); 
                              var testing3 = spawn('ip',['link','set','greUnime','up']);
                              testing3.stdout.on('data', function (data) {
                                 console.log('set link up: ' + data);
                              });
                              testing3.stderr.on('data', function (data) {
                                 console.log('set link up: ' + data);
                              });
                              testing3.on('close', function (code) {
                                 console.log('set link up process exited with code ' + code);
                              });
                           });
                        });
                     }
                  });
                  socatClient.on('close', function (code) {
                     console.log('socat process exited with code ' + code);
                  });
                                                                                                                                               
                  var rtpath = "/opt/demo/node-lighthing-rod-develop/node_modules/node-reverse-wstunnel/bin/wstt.js";
                  
console.log("LOOOOGGG::"+'-r '+args[4]+':localhost:'+basePort,reverseS_url);

                  rtClient = spawn(rtpath, ['-r '+args[4]+':localhost:'+basePort,reverseS_url]);
                  rtClient.stdout.on('data', function (data) {
                     console.log('stdout: ' + data);
                  });
                  rtClient.stderr.on('data', function (data) {
                     console.log('stderr: ' + data);
                  });
                  rtClient.on('close', function (code) {
                     console.log('child process exited with code ' + code);
                  });
                                                                                                                                                                                                                                                                                                                                            //simply waiting, that's bad, but how else ?
              break;
                case 'remove-from-network':
                   socatClient.kill('SIGINT');
                   rtClient.kill('SIGTERM');
                   spawn('ip',['link','del','greUnime']);
                   console.log('removed from network');
                   break;   
               
            
            }
         }
      }

      session.subscribe(topic_command, onCommandMessage);
   };

   connection.onclose = function (reason, details) {
      // handle connection lost  
   }

   connection.open();



});