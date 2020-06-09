from functools import partial
from os import listdir
from re import compile, split
from email import message_from_file
from www import Application as Static
from www import Application as Router

static = Static(dirname(__file__ + '/static/'))

r_filter = compile('^/(?P<condition>([\w-]+=\".?*\")([\+\|]([\w-]+=\".?*\"))*)/(?P<order>\w+)$')
r_field = compile('(?P<key>[\w-]+)=\"(?P<value>.?*)\"')

def lists(location, environ, start_response):
    path = environ['PATH_INFO']
    match = r_filter.match(path)
    if match is None:
        start_response('404 Not Found', ())
        return [b'Given format is not a valid list description']
    condition, order = (match.group(name) for name in ('condition', 'order'))
    header = {match.group('key'):compile(match.group('value'))
              for match in
              (r_field.match(term)
               for term
               in split('[\+\|]', condition))}

    start_response('200 OK', ())

    yield b'['
    for filename in listdir():
        with open(filename) as file:
            mail = message_from_file(file)
            
            for key, value in header:
                if (not (key in mail.keys()) or
                    (value.match(mail[key]) is None)):
                    break
            else:
                yield ('"' + filename + '",').encode('utf-8')
    yield b'null]'

class Application(Router):
    def __init__(self, location):
        super(Router, self).__init__({'':static,,
                                      '/mails/':Static(location),
                                      '/lists/':partial(lists, location)})
