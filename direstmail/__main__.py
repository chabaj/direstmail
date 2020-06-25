from wsgiref.simple_server import make_server
from . import application

from sys import argv

application.config['location'] = argv[-1]
application.config['users'] = {}

with make_server('', 8000, application) as httpd:
    print("Serving on port 8000...")

    # Serve until process is killed
    httpd.serve_forever()
