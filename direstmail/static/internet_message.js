function InternetMessage(header, body) {
    this.header = header
    this.body = body
}

InternetMessage.endofline = '\r\n'
InternetMessage.endofheader = (InternetMessage.endofline +
			       InternetMessage.endofline)
InternetMessage.field = /^(.+):\s+(.+?(?:\r\n\s+.*?)*)(?:\r\n)/

// TODO: break into subroutines
InternetMessage.parse = function (text) {
    var [text, ..._body] = text.split(InternetMessage.endofheader)
    var header = InternetMessage.parse.header(text)
    var body = _body.join(InternetMessage.endofheader)
    
    if (header['Content-Type'] !== undefined) {
	if (match = /multipart\/\w+;.*?\s*boundary=\"(.*?)\"/.exec(header['Content-Type'])) {
	    var boundary = match[1]
	    body = (body.split('\r\n--' + boundary + '--')[0]
		    .split('--' + boundary + '\r\n')
		    .slice(1, body.length)
		    .map(InternetMessage.parse))
	}
	else if (/^text\/\w+/.test(header['Content-Type'])) {
	    if (header['Content-Transfer-Encoding'] === 'base64') {
		body = atob(body)
		delete header['Content-Transfer-Encoding']
	    }
	    else if (header['Content-Transfer-Encoding'] === 'quoted-printable') {
		body = (body
			.replace(/=\r?\n/g, '')
			.replace(/((?:=(?:[0-9A-F]{2}))+)/g,
				 function (match) {
				     var buffer = new Uint8Array(match.split('=')
								 .filter(s=>s.length != 0)
								 .map(s=>Number.parseInt(s, 16)))
				     
				     return (new TextDecoder('utf-8')).decode(buffer)
				 }))
		delete header['Content-Transfer-Encoding']
	    }

	    if (/^text\/html/.test(header['Content-Type'])) {
		body = (new DOMParser()).parseFromString(body, 'text/html')
	    }
	}
	else if (header['Content-Transfer-Encoding'] === 'base64') {
	    var body = atob(body.replace(/\r\n/g, ''))
	    body = new Blob([new Uint8Array(Array.prototype.map.call(body,
								     c => c.charCodeAt(0)))],
			    {type:header['Content-Type']})
	    delete header['Content-Transfer-Encoding']
	}
    }

    return new InternetMessage(header, body)
}

InternetMessage.parse.header = function (text) {
    var header = {}
    var match
    text += InternetMessage.endofline
    
    while (match = InternetMessage.field.exec(text)) {
	header[match[1]] = match[2].replace(/\r\n\s+/g, '')
	text = text.slice(match[0].length, text.length)
    }

    return header
}
