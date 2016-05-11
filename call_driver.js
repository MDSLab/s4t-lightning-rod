/*
*				 Apache License
*                           Version 2.0, January 2004
*                        http://www.apache.org/licenses/
*
*      Copyright (c) 2014 2015 2016 Dario Bruneo, Francesco Longo, Giovanni Merlino, Nicola Peditto
* 
*/

var fuse = require('fuse-bindings')

var driverManager = require("./manage-drivers.js");

var mountpoint = '../drivers/temp_driver';


driverManager.mountDriver(["temp_driver"], "OK")


process.on('SIGINT', function () {
  
  console.log('CLOSING [SIGINT]');
  
  fuse.unmount(mountpoint, function (result) {
    console.log('Unmounting...');
    if(result === undefined){

      console.log('closing...');
      console.log("bye!");
      process.exit();

    }else{
      console.log('ERROR during unmounting: ' +result);
    }
    
  })
})