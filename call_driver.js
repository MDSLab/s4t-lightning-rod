
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