
var wts = require("node-reverse-wstunnel");

var autobahn = require('autobahn');
var os = require('os');
var ifaces = os.networkInterfaces();

var url_wamp_router = "ws://172.17.3.139:8181/ws";
var url_reverse_server = "ws://212.189.207.109:8080";

var connection = new autobahn.Connection({
	url: url_wamp_router,
	realm: "s4t"
});

var topic_command = 'board.command';
var topic_connection = 'board.connection';

var getIP = require('./lib/getIP.js');
var IPLocal = '127.0.0.1';//getIP('eth0', 'IPv4');


connection.onopen = function (session, details) {

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
               console.log(args[2]+','+url_reverse_server+','+IPLocal+':')
               
               reverse_client_ideino.start(args[2], url_reverse_server, IPLocal+':');
               break;

            case 'mode':
               break;
            case 'analog':
               break;
            case 'digital':
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
