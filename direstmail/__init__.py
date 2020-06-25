from functools import partial
from os import listdir, sep
from os.path import dirname, exists, abspath, join
from re import compile, split
from email import message_from_file
from flask import Flask, Response, send_from_directory, send_file, current_app, request, abort

application = Flask(__name__,
                    static_url_path='/',
                    static_folder=dirname(__file__) + '/static/')

r_filter = compile('^/(?P<condition>([\w-]+:\".*?\")([\.\|]([\w-]+:\".*?\"))*)/(?P<order>\w+)$')
r_field = compile('(?P<operation>[\.\|])?(?P<key>[\w-]+):\"(?P<value>.*?)\"')

@application.route('/lists/<string:_order>:<string:_field>/<path:condition>')
def lists(_order, _field, condition):
    user = request.remote_user
    try:
        user_mail_addresses = current_app.config['users'][user]
    except KeyError as ke:
        return abort(401)
    
    order = _order, _field
    location = current_app.config['location']

    header = {}
    while (term := r_field.match(condition)) is not None:
        condition = condition[term.end(0):]
        header[term.group('key')] = compile(term.group('value'))

    def generate():
        first = True
        yield b'['
        
        for filename in listdir(location):
            with open(location + sep + filename) as file:
                mail = message_from_file(file)

                visible = False
                for mail_addresses in (mail['From'], mail['To']):
                    for user_mail_address in user_mail_addresses:
                        if user_mail_address in mail_addresses:
                            visible = True
                            break
                    if visible:
                        break

                if not visible:
                    continue
                
                for key, rule in header.items():
                    if (not (key in mail.keys()) or
                        (rule.match(mail[key]) is None)):
                        break
                    else:
                        if not first:
                            yield b', '
                        else:
                            first = False
                        yield ('"' + filename + '"').encode('utf-8')
        yield b']'
    
    return Response(generate(), mimetype='text/csv')

# TODO: headers could be shifted by implementing a Content-Range approach on client side
#       then the mails view would be sufficient
#       and the headers view could be simply removed.
@application.route('/headers/<string:filename>')
def headers(filename):
    user = request.remote_user
    location = curent_app.config['location']
    filepath = join(location, filename)
    try:
        user_mail_addresses = current_app.config['users'][user]
    except KeyError as ke:
        return abort(401)

    with open(filepath) as file:
        mail = message_from_file(file)
        visible = False
        for mail_addresses in (mail['From'], mail['To']):
            for user_mail_address in user_mail_addresses:
                if user_mail_address in mail_addresses:
                    visible = True
                    break
            if visible:
                break

    if not visible:
        return abort(403)
        
    if filename.endswith('.eml'):
        def read_header():
            header_content_separator = b'\r\n\r\n'
            with open(filepath, 'rb').read() as file:
                buffer = b''
                while (byte := file.read(1)) is not None:
                    buffer += byte

                    if buffer.endswith(header_content_separator):
                        break
                    yield byte

                    buffer = buffer[-len(header_content_separator):]
        
        return Response(read_header(), 200)
    else:
        abort(404)

@application.route('/mails/<string:filename>')
def mails(filename):
    user = request.remote_user
    location = curent_app.config['location']
    filepath = join(location, filename)
    try:
        user_mail_addresses = current_app.config['users'][user]
    except KeyError as ke:
        return Response('Authenticate yourself !', 401)

    with open(filepath) as file:
        mail = message_from_file(file)
        visible = False
        for mail_addresses in (mail['From'], mail['To']):
            for user_mail_address in user_mail_addresses:
                if user_mail_address in mail_addresses:
                    visible = True
                    break
            if visible:
                break

    if not visible:
        return Response('Not Authorized', 403)

    if filepath.endswith('.eml'):
        return send_file(filepath)
    else:
        abort(404)

# @application.route('/<path:path>')
# def static(path):
#      return send_from_directory(static_path, path)
