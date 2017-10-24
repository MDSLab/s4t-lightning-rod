//############################################################################################
//##
//# Copyright (C) 2017 Dario Bruneo, Francesco Longo, Giovanni Merlino, Nicola Peditto
//##
//# Licensed under the Apache License, Version 2.0 (the "License");
//# you may not use this file except in compliance with the License.
//# You may obtain a copy of the License at
//##
//# http://www.apache.org/licenses/LICENSE-2.0
//##
//# Unless required by applicable law or agreed to in writing, software
//# distributed under the License is distributed on an "AS IS" BASIS,
//# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//# See the License for the specific language governing permissions and
//# limitations under the License.
//##
//############################################################################################

exports.Main = function (wampConnection, logger){

    //Connecting to the board
    var linino = require('ideino-linino-lib');
    board = new linino.Board();
    logger.info('[SYSTEM] - Board initialization...');

    //Given the way linino lib is designed we first need to connect to the board and only then we can do anything else
    board.connect(function() {
        
        // CONNECTION TO WAMP SERVER --------------------------------------------------------------------------
        logger.info('[WAMP] - Opening connection to WAMP server...');
        wampConnection.open();
        //-----------------------------------------------------------------------------------------------------

        // PLUGINS RESTART ALL --------------------------------------------------------------------------------
        //This procedure restarts all plugins in "ON" status
        var managePlugins = require('../modules/plugins-manager/manage-plugins');
        managePlugins.pluginsLoader();
        //-----------------------------------------------------------------------------------------------------

    });
    

};
