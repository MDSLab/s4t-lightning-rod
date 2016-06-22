/*
*				                  Apache License
*                           Version 2.0, January 2004
*                        http://www.apache.org/licenses/
*
*      Copyright (c) 2014 2015 2016 Dario Bruneo, Francesco Longo, Giovanni Merlino, Andrea Rocco Lotronto, Nicola Peditto
* 
*/

//service logging configuration: "manageCommands"   
var logger = log4js.getLogger('manageCommands');
logger.setLevel(loglevel);

//This function is called when a message is received on the command topic 
exports.onCommand = function (args){

    //The first argument of each message is the board code... if the message is for this board...
    if(args[0] == boardCode){
        
        //Check the type of message
        switch(args[1]){
            
            //If the messages are related to service to be exported call the corresponding method
            case 'tty':
            case 'ssh':
            case 'ideino':
            case 'osjs':
		        logger.info('[SERVICE] - L-R command received: ' + args[1] +' '+ args[2] +' '+ args[3]);
                var manageServices = require('./manage-services');
                manageServices.exportService(args);
                break;
            case 'add-to-network':
            case 'remove-from-network':
            case 'update-board':
		        logger.debug('[NETWORK] - L-R command received: ' + args[1] +' '+ args[2] +' '+ args[3]);
                var manageNetworks = require('./manage-networks');
                manageNetworks.manageNetworks(args);
                break;
        }
    } 
    
};