#############################################################################################
###
## Copyright (C) 2018 Nicola Peditto
###
## Licensed under the Apache License, Version 2.0 (the "License");
## you may not use this file except in compliance with the License.
## You may obtain a copy of the License at
###
## http://www.apache.org/licenses/LICENSE-2.0
###
## Unless required by applicable law or agreed to in writing, software
## distributed under the License is distributed on an "AS IS" BASIS,
## WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
## See the License for the specific language governing permissions and
## limitations under the License.
###
#############################################################################################

# User imports
from datetime import datetime

def main(plugin_name, params, api):

    logging = api.getLogger(plugin_name)

    extra = api.getExtraInfo()

    #result = extra['field1']
    #logging.info(str(extra) + " - " + str(result))

    result = extra
    logging.info("Board extra-info: " + str(result))

    return result