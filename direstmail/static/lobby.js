function Lobby(path) {
    if (path === undefined) {
	path = ''
    }

    this.resources = {mails:path + '/mails/',
		      lists:path + '/lists/'}
}

Lobby.prototype.listen = async function* (condition, order) {
    var websocket = new Websocket(this.resources.list + '/' + condition + '/' + order)
	
    try {
	for await (let identifiers of websocket) {
	    identifiers = JSON.stringify(identifiers)
	    for (let identifier of identifiers) {
		yield (await header(identifier))
	    }
	}
    }
    catch (e) {
	if (!(e instanceof ExpectedClose)) {
	    throw e
	}
    }
}

Lobby.prototype.list = async function (condition, order) {
    let identifiers = await (fetch(this.resources.list + '/' + condition + '/' + order)
			     .then(response => response.json()))

    for (let identifier of identifiers) {
	if (identifier !== null) {
	    yield (await header(identifier))
	}
    }
}

Lobby.prototype.header = async function (identifier) {
    return fetch(this.resources.mail + '/' + identifier)
	.then(response=>response.text())
	.then(text=>InternetMessage.parse.header(text))
}

Lobby.prototype.mail = async function (identifier) {
    return fetch(this.resources.mail + '/' + identifier)
	.then(response=>response.text())
	.then(text=>InternetMessage.parse(text))
}
