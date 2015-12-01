//This function is called when a message is received on the command topic 
exports.onCommand = function (args){
    
    console.log('Received message on command topic');
    
    //Read the board code in the configuration file
    var boardCode = nconf.get('config:board:code');

    //The first argument of each message is the board code
    //If the message is for this board
    if(args[0]==boardCode){
        
        console.log('It is a message for me with args: ' + args[1] +' '+ args[2] +' '+ args[3]);
        
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
