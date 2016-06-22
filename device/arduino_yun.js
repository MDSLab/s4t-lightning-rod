exports.Main = function (wampConnection, logger){
    /*
    //Writing to the watchdog file to signal I am alive
    require('shelljs/global');
    setInterval(function(){                    
    echo('1').to(‘/dev/watchdog’);
    },5000);
    */

    //Connecting to the board
    var linino = require('ideino-linino-lib');
    board = new linino.Board();
    logger.info('[SYSTEM] - Board initialization...');

    //Given the way linino lib is designed we first need to connect to the board and only then we can do anything else
    board.connect(function() {
        
        // CONNECTION TO WAMP SERVER --------------------------------------------------------------------------
        logger.info('[WAMP-STATUS] - Opening connection to WAMP server...');
        wampConnection.open();
        //-----------------------------------------------------------------------------------------------------

        // PLUGINS RESTART ALL --------------------------------------------------------------------------------
        //This procedure restarts all plugins in "ON" status
        var managePlugins = require('../manage-plugins');
        managePlugins.pluginsLoader();
        //-----------------------------------------------------------------------------------------------------

    });
    


} 
