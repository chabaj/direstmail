from functools import partial
from os import listdir, sep
from os.path import dirname
from re import compile, split
from email import message_from_file
from www.static import Application as Static
from www.router import Router

static = Static(dirname(__file__) + '/static/')

r_filter = compile('^/(?P<condition>([\w-]+:\".*?\")([\.\|]([\w-]+:\".*?\"))*)/(?P<order>\w+)$')
r_field = compile('(?P<operation>[\.\|])?(?P<key>[\w-]+):\"(?P<value>.*?)\"')

def lists(location, environ, start_response):
    path = environ['PATH_INFO']
    print('path: ', repr(path))
    match = r_filter.match(path)

    print('match:', match)
    if match is None:
        start_response('404 Not Found', [('Content-Type', 'text/plain')])
        yield b'Given format is not a valid list description'
        return
    
    condition, order = (match.group(name) for name in ('condition', 'order'))
    print('condition:', condition, ", order:", order)
    print(r_field.match(condition).groupdict())
    header = {}

    while (term := r_field.match(condition)) is not None:
        print(condition, term)
        condition = condition[term.end(0):]
        header[term.group('key')] = compile(term.group('value'))

    start_response('200 OK', [('Content-Type', 'application/json')])

    yield b'['
    for filename in listdir(location):
        with open(location + sep + filename) as file:
            mail = message_from_file(file)
            
            for key, rule in header.items():
                print(key, rule, "<>", mail[key])
                if (not (key in mail.keys()) or
                    (rule.match(mail[key]) is None)):
                    break
            else:
                yield ('"' + filename + '",').encode('utf-8')
    yield b'null]'

class Application(Router):
    def __init__(self, location):
        print('location:', location)
        super(Application, self).__init__((('/mails/', Static(location)),
                                           ('/lists/', partial(lists, location)),
                                           ('/', static)))
