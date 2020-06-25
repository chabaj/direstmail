function InternetMessage(header, body) {
    this.header = header
    this.body = body
}

/* TODO: implement serialization
InternetMessage.prototype.serialize = function () {
return string
}
*/
InternetMessage.endofline = '\r\n'
InternetMessage.endofheader = (InternetMessage.endofline +
			       InternetMessage.endofline)
InternetMessage.field = /^(.+?):\s+(.+?(?:\r\n\s+.*?)*)(?:\r\n)/

InternetMessage.parse = function (text) {
    var [text, ..._body] = text.split(InternetMessage.endofheader)
    var header = InternetMessage.parse.header(text)

    return new InternetMessage(header, InternetMessage.parse.body(header,
								  body.join(InternetMessage.endofheader)))
}

InternetMessage.parse.body = function (header, body) {
    if (header['Content-Type'] !== undefined) {
	if (let match = /multipart\/\w+;.*?\s*boundary=\"(.*?)\"/.exec(header['Content-Type'])) {
	    return InternetMessage.parse.body.multipart(match[1], body)
	}
	else if (/^text\/\w+/.test(header['Content-Type'])) {
	    return InternetMessage.parse.body.text(header, body)
	}
	else if (header['Content-Transfer-Encoding'] === 'base64') {
	    return InternetMessage.parse.body.binary(header, body)
	}
    }

    return body
}

InternetMessage.parse.body.multipart = function (boundary, body) {
    return (body.split('\r\n--' + boundary + '--')[0]
	    .split('--' + boundary + '\r\n')
	    .slice(1, body.length)
	    .map(InternetMessage.parse))
}

InternetMessage.parse.body.text = function (header, body) {
    if (header['Content-Transfer-Encoding'] === 'base64') {
	body = atob(body)
	delete header['Content-Transfer-Encoding']
    }
    else if (header['Content-Transfer-Encoding'] === 'quoted-printable') {
	body = InternetMessage.parse.decodeQuotedPrintable('utf-8', body)
	delete header['Content-Transfer-Encoding']
    }
    
    if (/^text\/html/.test(header['Content-Type'])) {
	body = (new DOMParser()).parseFromString(body, 'text/html')
    }

    return body
}

InternetMessage.parse.body.binary = function (header, body) {
    body = atob(body.replace(/\r\n/g, ''))
    body = new Blob([new Uint8Array(Array.prototype.map.call(body,
							     c => c.charCodeAt(0)))],
		    {type:header['Content-Type']})
    delete header['Content-Transfer-Encoding']
    return body
}

InternetMessage.parse.decodeQuotedPrintable = function (charset, text) {
    return (text.replace(/=\r?\n/g, '')
	    .replace(/((?:=(?:[0-9A-F]{2}))+)/g,
		 function (match) {
		     var buffer = new Uint8Array(match.split('=')
						 .filter(s=>s.length != 0)
						 .map(s=>Number.parseInt(s, 16)))
		     
		     return (new TextDecoder(charset)).decode(buffer)
		 }))
}

InternetMessage.parse.header = function (text) {
    var header = {}
    text += InternetMessage.endofline
    var match
    
    while (match = InternetMessage.field.exec(text)) {
	let [_, key, value] = match
	value = value.replace(/\r\n\s+/g, '')
	header[key] = InternetMessage.parse.header.decodeValue(value)
	text = text.slice(match[0].length, text.length)
    }
    
    return header
}

InternetMessage.parse.header.decodeValue = function (value) {
    return value.replace(/=\?(.*?)\?(.*?)\?(.*?)\?=/g,
			 function (match, charset, encoding, text) {
			     if (encoding === 'B') {
				 return (new TextDecoder(charset)
					 .decode(new Uint8Array(Array.from(atob(text))
								.map(c=>c.charCodeAt(c, 0))))
					)
			     }
			     else if (encoding === 'Q') {
				 return InternetMessage.parse.decodeQuotedPrintable(charset, text)
			     }
			     return match
			 })
}
