
//service logging configuration: "manageCommands"   
var logger = log4js.getLogger('manageCommands');

//This function is called when a message is received on the command topic 
exports.onCommand = function (args){
    
<<<<<<< HEAD
    logger.info('L-R COMMAND - Received message on command topic');
=======
    //logger.info('L-R COMMAND - Received message on command topic');
>>>>>>> net-dev-vlans
    
    //Read the board code in the configuration file
    var boardCode = nconf.get('config:board:code');

    //The first argument of each message is the board code
    //If the message is for this board
    if(args[0] == boardCode){
        
        logger.info('L-R COMMAND - It is a message for me with args: ' + args[1] +' '+ args[2] +' '+ args[3]);
        
        //Check the type of message
        switch(args[1]){
            
            //If the messages are related to service to be exported call the corresponding method
            case 'tty':
            case 'ssh':
            case 'ideino':
            case 'osjs':
                var manageServices = require('./manage-services');
                manageServices.exportService(args);
                break;
            case 'add-to-network':
            case 'remove-from-network':
            case 'update-board':
                var manageNetworks = require('./manage-networks');
                manageNetworks.manageNetworks(args);
                break;
        }
    }              
}
