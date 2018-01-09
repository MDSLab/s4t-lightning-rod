//############################################################################################
//##
//# Copyright (C) 2017 Nicola Peditto
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


function Device(name) {

    if (this.constructor === Device) {
        throw new Error("Cannot instantiate this class");
    }else{

        this.name = name;

    }


}



Device.prototype.Main = function() {
    throw new Error("Abstract method: it needs to be implemented.");
};


Device.prototype.readDigital = function (pin) {
    throw new Error("Abstract method: it needs to be implemented.");
};


Device.prototype.writeDigital = function (pin, value) {
    throw new Error("Abstract method: it needs to be implemented.");
};


Device.prototype.readAnalog = function (pin) {
    throw new Error("Abstract method: it needs to be implemented.");
};


Device.prototype.writeAnalog = function (pin, value) {
    throw new Error("Abstract method: it needs to be implemented.");
};


Device.prototype.setMode = function (pin, mode) {
    throw new Error("Abstract method: it needs to be implemented.");
};


module.exports = Device;