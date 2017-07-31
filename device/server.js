exports.Main = function (wampConnection, logger){

    // CONNECTION TO WAMP SERVER --------------------------------------------------------------------------
    logger.info('[WAMP] - Opening connection to WAMP server...');
    wampConnection.open();
    //-----------------------------------------------------------------------------------------------------

    // PLUGINS RESTART ALL --------------------------------------------------------------------------------
    //This procedure restarts all plugins in "ON" status
    var managePlugins = require('../modules/plugins-manager/manage-plugins');
    managePlugins.pluginsLoader();
    //-----------------------------------------------------------------------------------------------------

};