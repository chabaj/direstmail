function repr(message) {
    var [_, major, minor] = /(\w+)\/(\w+)(?:\s+.*)?/.exec(message.header['Content-Type'])
    var handle = repr.get_handler(major, minor)

    console.log([major, minor], handle)
    return handle(message)
}

repr.get_handler = function (major, minor) {
    var handler = repr[major]
    var subhandler

    if (handler !== undefined) {
	subhandler = handler[minor]

	if (subhandler !== undefined) {
	    handler = subhandler
	}
    }
    else {
	handler = repr.binary
    }

    return handler
}

repr.image = function (message) {
    var image = document.createElement('img')

    image.setAttribute('src', URL.createObjectURL(message.body))
    
    return image
}

repr.text = function (message) {
    var pre = document.createElement('pre')
    pre.appendChild(document.createTextNode(message.body))
    return pre
}

repr.text.html = function (message) {
    var body = message.body.children[0]
    console.log(body)
    // remove javascript interaction from html document
    Array.from(body.querySelectorAll('script')).map(element => element.remove())
    Array.from(body.querySelectorAll('*'))
	.map(element => (Array.from(element.attributes)
			 .filter(attribute => /^on/.test(attribute.name))
			 .map(attribute => element.removeAttribute(attribute.name))))

    return body
}

repr.multipart = function (message) {
    var section = document.createElement('div')

    for (let part of message.body) {
	section.appendChild(repr(part))
    }
    
    return section
}

repr.multipart.mixed = function (message) {
    var section = document.createElement('div')

    for (let part of message.body) {
	let element = repr(part)

	if (element.nodeName === 'IMG') {
	    let anchor = document.createElement('a')
	    element.setAttribute('style', 'width:150px')
	    
	    anchor.setAttribute('href', element.getAttribute('src'))
	    anchor.setAttribute('download',
				/^.*?\"(.*)\"$/.exec(part.header['Content-Disposition'])[1])
	    
	    anchor.appendChild(element)
	    element = anchor
	}
	
	section.appendChild(element)
    }
    
    return section
}

repr.multipart.related = function (message) {
    var html_part = message.body.filter(message => (message
						    .header['Content-Type']
						    .startsWith('text/html')))[0]
    var html = repr(html_part)
    var related_contents = message.body.reduce(function (accumulator, message) {
	if (message.header['Content-ID']) {
	    accumulator[message.header['Content-ID'].slice(1, -1)] = message
	}
	
	return accumulator
    },
					       {})
    
    for (let img of Array.from(html.querySelectorAll('img'))) {
	let src = img.getAttribute('src')

	if (src.startsWith('cid:')) {
	    src = src.slice('cid:'.length, src.length)
	    related_content = related_contents[src]
	    
	    if(related_content) {
		img.setAttribute('src', URL.createObjectURL(related_content.body))
	    }
	}
    }

    for (let a of Array.from(html.querySelectorAll('a'))) {
	let href = a.getAttribute('href')
	
	if (href && href.startsWith('cid:')) {
	    href = href.slice('cid:'.length, href.length)
	    related_content = related_contents[href]
	    
	    if(related_content) {
		a.setAttribute('href', URL.createObjectURL(related_content.body))
	    }
	}
    }

    return html
}

repr.multipart.alternative = function (message) {
    return repr(message.body
		.filter(message => (message.header['Content-Type'].startsWith('text/html') ||
				    message.header['Content-Type'].startsWith('text/plain') ||
				    message.header['Content-Type'].startsWith('multipart/related')))
		.slice(-1)[0])
}

repr.binary = function (message) {
    var anchor = document.createElement('a')
    var filename = /^.*?\"(.*)\"$/.exec(message.header['Content-Disposition'])[1]

    anchor.setAttribute('href', URL.createObjectURL(message.body))
    anchor.setAttribute('download', filename)
    anchor.appendChild(document.createTextNode(filename))
    return anchor
}  
