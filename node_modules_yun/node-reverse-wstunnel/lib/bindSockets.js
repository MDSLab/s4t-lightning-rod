//###############################################################################
//##
//# Copyright (C) 2014-2015 Andrea Rocco Lotronto
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
//###############################################################################
(function() {
  var bindSockets;

  module.exports = bindSockets = function(wsconn, tcpconn) {
    wsconn.__paused = false;
    wsconn.on('message', function(message) {
      if (message.type === 'utf8') {
        return console.log('Error, Not supposed to received message ');
      } else if (message.type === 'binary') {
        if (false === tcpconn.write(message.binaryData)) {
          wsconn.socket.pause();
          wsconn.__paused = true;
          return "";
        } else {
          if (true === wsconn.__paused) {
            wsconn.socket.resume();
            return wsconn.__paused = false;
          }
        }
      }
    });
    tcpconn.on("drain", function() {
      wsconn.socket.resume();
      return wsconn.__paused = false;
    });
    wsconn.on("overflow", function() {
      return tcpconn.pause();
    });
    wsconn.socket.on("drain", function() {
      return tcpconn.resume();
    });
    tcpconn.on("data", function(buffer) {
      return wsconn.sendBytes(buffer);
    });
    wsconn.on("error", function(err) {
      return console.log((new Date()) + 'ws Error ' + err);
    });
    tcpconn.on("error", function(err) {
      return console.log((new Date()) + 'tcp Error ' + err);
    });
    wsconn.on('close', function(reasonCode, description) {
      console.log((new Date()) + 'ws Peer ' + wsconn.remoteAddress + ' disconnected for: '+description);
      return tcpconn.destroy();
    });
    return tcpconn.on("close", function() {
      console.log((new Date()) + 'tunnel disconnected.');
      return wsconn.close();
    });
  };

}).call(this);
