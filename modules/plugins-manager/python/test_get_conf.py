import json
import os

SETTINGS_PATH = os.environ['IOTRONIC_HOME']+"/settings.json"

with open(SETTINGS_PATH) as json_file:

    settings = json.load(json_file)
    #print(settings)
    #extra = json.dumps(settings['config']['extra'])
    extra=settings['config']['extra']
    print(extra)
    print(extra['field1'])

    """
    extra = json.loads(extra)
    print(extra['field1'])

    for p in extra:
        print(extra[p])
    """



