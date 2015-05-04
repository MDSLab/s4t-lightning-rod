var wts = require("node-reverse-wstunnel");
var autobahn = require('autobahn');

var os = require('os');
var ifaces = os.networkInterfaces();

//Load configuration file
var nconf = require('nconf');
nconf.file ({file: 'setting.json'});

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
               case 'ssh':
                  //DEBUG
                  console.log("Start REVERSE for ssh");
                  
                  var reverse_client_ssh = new wts.client_reverse;
                  
                  //DEBUG
                  console.log(typeof(reverse_client_ssh));
                  console.log(args[2]+','+url_reverse_server+','+IPLocal+':22')
                  
                  reverse_client_ssh.start(args[2], url_reverse_server, IPLocal+':22');
                  break;
               case 'ideino':
                  //DEBUG
                  console.log("Start REVERSE for ideino");
                  
                  var reverse_client_ideino = new wts.client_reverse;
                  //DEBUG
                  console.log(typeof(reverse_client_ideino));
                  console.log(args[2]+','+url_reverse_server+','+IPLocal+':2424')
                  
                  reverse_client_ideino.start(args[2], url_reverse_server, IPLocal+':2424');
                  break;
               case 'osjs':
                  //DEBUG
                  console.log("Start REVERSE for osjs");               
                  var reverse_client_ideino = new wts.client_reverse;

                  //DEBUG
                  console.log(typeof(reverse_client_ideino));
                  console.log(args[2]+','+url_reverse_server+','+IPLocal+':8000')
                  
                  reverse_client_ideino.start(args[2], url_reverse_server, IPLocal+':8000');
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