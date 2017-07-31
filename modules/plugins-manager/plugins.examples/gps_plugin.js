//JSON to send 
// {
//     'm_authid': '',
//     'm_resourceid': '',
//     'gps_device_command': '',
//     'gps_device_data': '',
//     'ckan_host': '',
//     'ckan_port': '',
//     'ckan_path': ''
// }


exports.main = function (arguments){
    var m_authid = arguments.m_authid;
    var m_resourceid = arguments.m_resourceid;
    var gps_device_command = arguments.gps_device_command;
    var gps_device_data = arguments.gps_device_data;
    var ckan_host = arguments.ckan_host;
    var ckan_port = arguments.ckan_port;
    var ckan_path = arguments.ckan_path;
    
    var http = require('http');
    var gpsd = require('node-gpsd');
    var modem = require('modem').Modem();
    var exec = require('child_process').exec;
    
    modem.open(gps_device_command, function() {
        console.log('Connected to ' + gps_device_command);
        var job = modem.execute('AT+CGPS?', function(escape_char, response){
            if(response == 'OK'){
                
                console.log('It is working');
                modem.close();
                
                exec('/root/dialup.sh', function(error, stdout, stderr){
                    console.log('Starting PPP connection: ' + stdout);
                });
                
                var daemon = new gpsd.Daemon({
                    program: 'gpsd',
                    device: gps_device_data,
                    port: 2947,
                    pid: '/tmp/gpsd.pid'
                });
                
                daemon.start(function(err, result) {
                    console.log('Deamon started'); 
                    
                    var listener = new gpsd.Listener({
                        parse: true,
                        parsejson: true
                    });
                    
                    listener.connect(function() {
                        console.log('Connected');
                        
                        listener.watch();
                        
                        listener.on('TPV', function(data){
                            if(data.tag == 'RMC'){
                                delete data.class;
                                delete data.tag;
                                delete data.device;
                                delete data.mode;
                                
                                var record = [];
                                
                                var header = {
                                    'Content-Type': "application/json",
                                    'Authorization' : m_authid
                                };
                                
                                var options = {
                                    host: ckan_host,
                                    port: ckan_port,
                                    path: ckan_path,
                                    method: 'POST',
                                    headers: header
                                };
                                
                                record.push(data);
                                
                                var payload = {
                                    resource_id : m_resourceid,
                                    method: 'insert',
                                    records : record
                                };
                                
                                var payloadJSON = JSON.stringify(payload);
                                
                                var req = http.request(options, function(res) {
                                    
                                    res.setEncoding('utf-8');
                                    
                                    var responseString = '';
                                    
                                });
                                
                                req.on('error', function(e) {
                                    console.log('On Error:'+e);
                                });
                                
                                req.write(payloadJSON);
                                
                                req.end();
                                
                                console.log("sent to CKAN, JSON: %j", data);
                            };
                        });        
                    });
                });
            }
            else{
                console.log('I need to reboot');
                modem.close();
                exec('reboot', function(error, stdout, stderr){
                    console.log('Rebooting now: ' + stdout);
                });
            }
        }, true, 4000)
        job.on('timeout', function(data){
            console.log('Timed out on test command');
            modem.close();
            exec('reboot', function(error, stdout, stderr){
                console.log('Rebooting now: ' + stdout);
            });
        });
    });
}
