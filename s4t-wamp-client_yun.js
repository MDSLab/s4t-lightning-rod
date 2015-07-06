/*
Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

Copyright (c) 2014 2015 Andrea Rocco Lotronto, Arthur Warnier
*/
var wts = require("node-reverse-wstunnel");
var autobahn = require('autobahn');
var spawn = require('child_process').spawn;

var http = require('http');

var os = require('os');
var ifaces = os.networkInterfaces();

//Load configuration file
var nconf = require('nconf');
nconf.file ({file: 'setting.json'});

var basePort = nconf.get('config:socat:client:port');
var wampR_url = nconf.get('config:wamp:url')+":"+nconf.get('config:wamp:port')+"/ws";
var reverseS_url = nconf.get('config:reverse:server:url')+":"+nconf.get('config:reverse:server:port');
var wamp_realm = nconf.get('config:wamp:realm');
var rtpath = nconf.get('config:reverse:lib:bin');
var board_code = nconf.get('config:board:code');

//DEBUG
//console.log(wampR_url);
//console.log(reverseS_url);
//console.log(wamp_realm);

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

var socatClient = [];
var rtClient = [];
var servicesProcess=[];
var misuraTemp;

//var jf = require('jsonfile');
//var util = require('util');
var fs = require('fs');

//As first step we need to use the function 'connect' of the object 'linino.Board()'' 
board.connect( function(){
   var greDevices = [];//Arthur
   //After the connection is ready we can use the ideino-linino-lib to controll the PIN
   //of the board
   connection.onopen = function (session, details) {

      restartMeasure(board);

      //DEBUG
      //console.log("SESSION ID"+Object.getOwnPropertyNames(session));
      //console.log("AAAAAAAAAAAAAAAAAAAaa:::::::::"+session._realm);
      //console.log("AAAAAAAAAAAAAAAAAAAaa:::::::::"+session._id);

      //Define a RPC to Read Data from PIN
      function readDigital(args){
         try{
            value = board.digitalRead(args[2]);
            return value;
         }catch(ex){
            return ex.message;
         }
      }
      //Define a RPC to Write Data from PIN
      function writeDigital(args){
         try{
            board.digitalWrite(args[2],parseInt(args[3]));
            return 0;
         }catch(ex){
            return ex.message;
         }
      }
      //Define a RPC to Read Data from PIN
      function readAnalog(args){
         try{
            value = board.analogRead(args[2]);
            return value;
         }catch(ex){
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
         try{
            board.pinMode(args[0],args[1]);
            return 0;   
         }catch(ex){
            return ex.message;
         }
      }

      //Define a RPC to Set a Misure
      function sendTemp(args){
         //console.log("args::"+args);
         var obj           = JSON.parse(fs.readFileSync('setting.json'));
         var time          = obj.config.board.sensors.temp.time;
         var resourceid    = obj.config.board.sensors.temp.resource_id;
         var authid        = obj.config.board.sensors.temp.auth_id;
         var status        = obj.config.board.sensors.temp.status;

         //DEBUG
         //console.log("status::"+status);
         //console.log("args[0]::"+args[0]);

         if(resourceid != undefined && authid != undefined){
            if(status==='on'){
               if(args[0]==='off'){
                  clearInterval(misuraTemp);
                  obj.config.board.sensors.temp.status = args[0];
                  console.log(obj);
                  fs.writeFileSync('setting.json', JSON.stringify(obj));
                  var result = {
                     message: 'Measure stopped',
                     name: 'Temp',
                     time: time
                  };
                  return result;
               }
               if(args[0]==='on'){
                  var result = {
                     message: 'Measure already started',
                     name: 'Temp',
                     time: time
                  };
                  return result;
               }
            }
            if(status==='off'){
               if(args[0]==='on'){
                  startTempMeasure(board,time,resourceid,authid);
                  obj.config.board.sensors.temp.status = args[0];
                  console.log(obj);
                  fs.writeFileSync('setting.json', JSON.stringify(obj));
                  var result = {
                     message: 'Measure started',
                     name: 'Temp',
                     time: time
                  };
                  return result;  
               }
               if(args[0]==='off'){
                  var result = {
                     message: 'Measure already stopped',
                     name: 'Temp',
                     time: time
                  };
                  return result;
               }
            }
         }
         else{
            var result = {
               message: 'Error',
               name: null,
               time: null
            };
            return result;
         }
      }

      //Register a RPC for remoting
      //session.register(os.hostname()+'command.rpc.setMisure', setMisure);
      session.register(board_code+'.command.rpc.temp', sendTemp);
      //session.register(os.hostname()+'.command.rpc.setmode', setMode);
      session.register(board_code+'.command.rpc.setmode', setMode);
      
      //session.register(os.hostname()+'.command.rpc.read.digital', readDigital);
      //session.register(os.hostname()+'.command.rpc.write.digital', writeDigital);
      session.register(board_code+'.command.rpc.read.digital', readDigital);
      session.register(board_code+'.command.rpc.write.digital', writeDigital);

      //session.register(os.hostname()+'.command.rpc.read.analog', readAnalog);
      //session.register(os.hostname()+'.command.rpc.write.analog', writeAnalog);
      session.register(board_code+'.command.rpc.read.analog', readAnalog);
      session.register(board_code+'.command.rpc.write.analog', writeAnalog);

      // Publish, Subscribe, Call and Register
      console.log("Connected to WAMP router: "+wampR_url);
      
      //Registro la scheda pubblicando su un topic
      console.log("Send my ID on topic: "+topic_connection);


      //session.publish(topic_connection, [os.hostname(), 'connection', session._id]);
      session.publish(topic_connection, [board_code, 'connection', session._id]);

      //Gestione chiusura comunicazione al server
      /*
      process.on('SIGINT', function(){
         session.publish(topic_connection, [os.hostname(), 'disconnect', session._id]);
         process.exit();
      });

      process.on('SIGTERM', function(){
         session.publish(topic_connection, [os.hostname(), 'disconnect', session._id]);
         process.exit();
      });
      */

      //Manage the command topic
      var onCommandMessage = function (args){
         
         //DEBUG
         console.log('Receive:::'+args[0]);
         //console.log(rtpath);

         //if(args[0]==os.hostname()){
         if(args[0]==board_code){
            switch(args[1]){
               case 'tty':
                  exportService(args[1],args[2],nconf.get('config:board:services:tty:port'),args[3]);
                  break;

               case 'ssh':
                  exportService(args[1],args[2],nconf.get('config:board:services:ssh:port'),args[3]);
                  break;
               case 'ideino':
                  exportService(args[1],args[2],nconf.get('config:board:services:ideino:port'),args[3]);
                  break;

               case 'osjs':
                  exportService(args[1],args[2],nconf.get('config:board:services:osjs:port'),args[3]);
                  break;
               //Arthur new
               case 'add-to-network':
                  /*
                  console.log("Start configuring network topology");
                  console.log('host tunIP: ' + JSON.stringify(args[2]));
                  console.log('server tunIP: ' + JSON.stringify(args[3]));
                  console.log('server socat port: ' + JSON.stringify(args[4]));
                  console.log('host greIP: ' + JSON.stringify(args[5]));
                  console.log('broadcast gre: ' + JSON.stringify(args[6]));
                  console.log('subnet mask: ' + JSON.stringify(args[7]));
                  console.log('gretap name: ' + JSON.stringify(args[8]));
                  console.log('socat port number: ' + JSON.stringify(args[9]));
                  */   
                  var sClientElem = {
                     key: args[9],
                     process: spawn('socat', ['-d','-d','TCP-L:'+ (parseInt(basePort)+args[9]) +',bind=localhost,reuseaddr,forever,interval=10','TUN:'+args[2]+'/30,tun-name=socattun'+args[9]+',up'])
                  }

                  socatClient.push(sClientElem);
                  
                  sClientElem.process.stdout.on('data', function (data) {
                     console.log('stdout: ' + data);
                  });
                  sClientElem.process.stderr.on('data', function (data) {
                     var textdata = 'stderr: ' + data;
                     console.log(textdata);
                     if(textdata.indexOf("starting data transfer loop") > -1) {
                        spawn('ifconfig',['socattun'+args[9],'up']);

                        var testing = spawn('ip',['link','add',args[8],'type','gretap','remote',args[3],'local',args[2]]);                 
                        
                        testing.on('error',function(err){throw err});
                        testing.stdout.on('data', function (data) {
                           console.log('create link: ' + data);
                        });
                        testing.stderr.on('data', function (data) {
                           console.log('create link: ' + data);
                        });
                        testing.on('close', function (code) {
                           console.log('create link process exited with code ' + code);
                           if(code == 0) {
                              greDevices.push(args[8]);
                              var testing2 = spawn('ip',['addr','add',args[5]+'/'+args[7],'broadcast',args[6],'dev',args[8]]); 
                              testing2.stdout.on('add ip: ', function (data) { 
                                 console.log('stdout: ' + data); 
                              });
                              testing2.stderr.on('add ip: ', function (data) { 
                                 console.log('stderr: ' + data);
                              });
                              testing2.on('close', function (code) {
                                 console.log('add ip process exited with code ' + code); 
                                 var testing3 = spawn('ip',['link','set',args[8],'up']);
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
                           }
                        });
                     }
                  });
                  sClientElem.process.on('close', function (code) { //in case of disconnection, delete all interfaces
                     console.log('socat process exited with code ' + code);
                  });

                  //DEBUG
                  console.log(rtpath);
                                                                                                                                               
                  //var rtpath = "/opt/demo/node-lighthing-rod-develop/node_modules/node-reverse-wstunnel/bin/wstt.js";

                  var rtClientElem = {
                     key: args[9],
                     process: spawn(rtpath, ['-r '+args[4]+':localhost:'+(parseInt(basePort)+args[9]),reverseS_url])
                  }

                  rtClient.push(rtClientElem); 
                  rtClientElem.stdout.on('data', function (data) {
                     console.log('stdout: ' + data);
                  });
                  rtClientElem.stderr.on('data', function (data) {
                     console.log('stderr: ' + data);
                  });
                  rtClientElem.on('close', function (code) {
                     console.log('child process exited with code ' + code);
                  });                                                                                                                                                                                                                                                                                                                                   //simply waiting, that's bad, but how else ?
                  break;
               case 'remove-from-network':
                  var position = findValue(socatClient,args[3],'key');
                  socatClient[position].process.kill('SIGINT');
                  rtClient[position].process.kill('SIGTERM');
                  socatClient.splice(position,1);
                  rtClient.splice(position,1);
                  spawn('ip',['link','del',args[2]]);
                  break;
               case 'update-board':
                  var testing = spawn('ip',['link','set',args[3],'down']);
                  testing.on('close', function (code) {
                     var testing2 = spawn('ip',['addr','del',args[4],'dev',args[3]]);
                     testing2.on('close',function (code) {
                        var testing3 = spawn('ip',['addr','add',args[2],'broadcast',args[5],'dev',args[3]]);
                        testing3.on('close',function (code) {
                           spawn('ip',['link','set',args[3],'up']);
                        })
                     });
                  });
                  break;
               
            }
         }              
      }
      session.subscribe(topic_command, onCommandMessage);

      //THIS IS AN HACK TO FORCE RECONNECTION AFTER A BREAK OF INTERNET CONNECTION
      setInterval(function(){
         //console.log("Session status:: 'session.isOpen'"+session.isOpen);
         //console.log("Session status:: 'session.id'"+session.id);
         session.publish(topic_connection, ['alive']);
      },5000);

   };

   connection.onclose = function (reason, details) {
      //DEBUGG
      console.log("Connection close for::"+reason);
      console.log("Connection close for::");
      console.dir(details);
   }

   connection.open();

});

//Function to check and restart measure
function restartMeasure(m_board){
   var obj           = JSON.parse(fs.readFileSync('setting.json'));
   //console.log(obj);
   //console.log("OBJ");
   //console.dir(obj);
   
   var time          = obj.config.board.sensors.temp.time;
   var resourceid    = obj.config.board.sensors.temp.resource_id;
   var authid        = obj.config.board.sensors.temp.auth_id;
   var status        = obj.config.board.sensors.temp.status       
   
   
   if(status == 'on'){
      console.log("Measure Temp is Started!!");
      startTempMeasure(m_board,time,resourceid,authid);
   }
   else{
      //DEBUG
      console.log("Measure Temp is Stopped!!");
   }
}

function startTempMeasure(m_board, m_time, m_resourceid, m_authid){
   var pin           = 'A4';
   //try{
      misuraTemp = setInterval(function(){
         var record = [];
         var sensor = m_board.analogRead(pin);
         var volt =  (sensor / 1024.0) * 4.54;
         var cel = (volt - 0.5) * 100;

         //console.log(record+","+sensor+","+volt+","+cel);

         var header = {
            'Content-Type': "application/json", 
            'Authorization' : m_authid
         };

         var options = {
            host: 'smartme-data.unime.it',
            port: 80,
            path: '/api/3/action/datastore_upsert',
            method: 'POST',
            headers: header
         };

         //console.log(options);
   
         record.push({
            Date: new Date().toISOString(),
            Temperature: cel,
            Altitude: 0,
            Latitude: 38.259525, 
            Longitude :15.595515
         });

         var payload = {
            resource_id : m_resourceid, 
            method: 'insert', 
            records : record
         }

         var payloadJSON = JSON.stringify(payload);

         //console.log(options);
         //console.dir(payloadJSON);

         
         var req = http.request(options, function(res) {
            res.setEncoding('utf-8');

            var responseString = '';

            res.on('data', function(data) {
               //responseString += data;
               //console.log('On Data: '+ responseString);
            });

            res.on('end', function() {
               //var resultObject = JSON.parse(responseString);
               //console.log('On End: ');
               //console.dir(resultObject);
            });
         });

         req.on('error', function(e) {
            console.log('On Error:'+e);
  
         });

         req.write(payloadJSON);

         req.end();
         console.log("Temperature data sent")
      },m_time);
      //return 0;
      //}catch(ex){
      //   return ex.message;
      //}*/
}

/*
This function export a generic local service of the board 
*/
function exportService(s_name, r_port, l_port, op){
   if(op === "start"){
      var Elem = {
         key: s_name,
         process: spawn(rtpath, ['-r '+r_port+':'+IPLocal+':'+l_port, reverseS_url])
      };

      servicesProcess.push(Elem);

      Elem.process.stdout.on('data', function(data){
         console.log('stdout: '+data);
      });
      Elem.process.stderr.on('data', function(data){
         console.log('stderr: '+ data);
      });
      Elem.process.on('close', function(code){
         console.log('child process exited with code '+ code);
      });

   }
   if(op === "stop"){
      var i = findValue(servicesProcess, s_name, 'key');
      servicesProcess[i].process.kill('SIGINT');
      servicesProcess.splice(i,1);
   }
}

//Function to kill a generic process using the PID
function killProcess(pid){
   //DEBUG
   console.log("Process PID::"+pid);
   process.kill(pid);
}

function findValue(myArray, value, property) {
   for(var i = 0, len = myArray.length; i < len; i++) {
      if (myArray[i][property] === value) {
         return i;
      }
   }
   return -1;
}