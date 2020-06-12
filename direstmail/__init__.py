from functools import partial
from os import listdir, sep
from os.path import dirname, exists, abspath
from re import compile, split
from email import message_from_file
from www.static import Application as Static
from www.router import Router

static = Static(dirname(__file__) + '/static/')

r_filter = compile('^/(?P<condition>([\w-]+:\".*?\")([\.\|]([\w-]+:\".*?\"))*)/(?P<order>\w+)$')
r_field = compile('(?P<operation>[\.\|])?(?P<key>[\w-]+):\"(?P<value>.*?)\"')

def lists(location, environ, start_response):
    path = environ['PATH_INFO']
    match = r_filter.match(path)

    if match is None:
        start_response('404 Not Found', [('Content-Type', 'text/plain')])
        yield b'Given format is not a valid list description'
        return
    
    condition, order = (match.group(name) for name in ('condition', 'order'))
    header = {}

    while (term := r_field.match(condition)) is not None:
        condition = condition[term.end(0):]
        header[term.group('key')] = compile(term.group('value'))

    start_response('200 OK', [('Content-Type', 'application/json')])

    yield b'['
    for filename in listdir(location):
        with open(location + sep + filename) as file:
            mail = message_from_file(file)
            
            for key, rule in header.items():
                if (not (key in mail.keys()) or
                    (rule.match(mail[key]) is None)):
                    break
            else:
                yield ('"' + filename + '",').encode('utf-8')
    yield b'null]'

def headers(location, environ, start_response):
    path = environ['PATH_INFO']
    filepath = abspath(location + sep + path)
    
    if not filepath.startswith(location) or not exists(filepath):
        start_response('404 Not Found', [('Content-Type', 'text/plain')])
        return [b'No such mail']
    
    with open(filepath, 'rb') as file:
        start_response('202 Ok', ('Content-Type', 'text/plain'))
        return [file.split(b'\r\n' * 2, 1)[0]]

class Application(Router):
    def __init__(self, location):
        super(Application, self).__init__((('/mails/', Static(location)),
                                           ('/headers/', partial(headers, location)),
                                           ('/lists/', partial(lists, location)),
                                           ('/', static)))
