/*
Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

Copyright (c) 2014 2015 Andrea Rocco Lotronto
*/

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
var wamp_realm = nconf.get('config:wamp:realm');

var reverseS_url = nconf.get('config:reverse:server:url')+":"+nconf.get('config:reverse:server:port');


//DEBUG
console.log(wampR_url);
console.log(reverseS_url);
console.log(wamp_realm);
//console.log(rtpath);
var connection = new autobahn.Connection({
   url: wampR_url,
   realm: wamp_realm
});

var topic_command = 'board.command';
var topic_connection = 'board.connection';

var getIP = require('./lib/getIP.js'); //in this moment is not used
var IPLocal = '127.0.0.1';//getIP('eth0', 'IPv4');



connection.onopen = function (session, details) {

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
      console.log('');
      
      var rtpath = nconf.get('config:reverse:lib:bin');
      console.log(rtpath);

   	if(args[0]==os.hostname()){
   		switch(args[1]){
   			case 'ssh':
               //DEBUG
               console.log("Args 3::::"+args[3]);
               if(args[3]=="start"){
               console.log("Start REVERSE for ssh");
   				
   				//var reverse_client_ssh = new wts.client_reverse;
   				
               //DEBUG
               //console.log(typeof(reverse_client_ssh));
               console.log(args[2]+','+reverseS_url+','+IPLocal+':22')
               
               //reverse_client_ssh.start(args[2], reverseS_url, IPLocal+':22');
              
               rClientSS = spawn(rtpath, ['-r '+args[2]+":"+IPLocal+':22',reverseS_url]);
               rClientSS.stdout.on('data', function (data) {
                     console.log('stdout: ' + data);
                  });
               rClientSS.stderr.on('data', function (data) {
                     console.log('stderr: ' + data);
                  });
               rClientSS.on('close', function (code) {
                     console.log('child process exited with code ' + code);
                  });     
   				}
               if(args[3]=="stop"){
                  rClientSS.kill();
               }
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
                                                                                                                                               
                  
                  rtClient = spawn(rtpath, ['-r '+args[4]+':localhost:'+basePort,reverseS_url]);
                  rtClient.stdout.on('data', function (data) {
                     console.log('stdout: ' + data);
                  });
                  rtClient.stderr.on('data', function (data) {
                     console.log('stderr: ' + data);
                  });
                  rtClient.on('close', function (code) {
                     console.log('child process exited with code ' + code);
                  });                                                                                                                                                                                                                                                                                                               //simply waiting, that's bad, but how else ?
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
