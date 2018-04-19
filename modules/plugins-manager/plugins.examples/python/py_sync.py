# User imports
from datetime import datetime


def main(params):

    print("Plugin Thread starting...")
    print("--> PARAMS: " + params)

    now = datetime.now().strftime( "%-d %b %Y %H:%M:%S.%f" )
    return {"time":now, "name":params['name']}