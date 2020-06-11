function Lobby(path) {
    if (path === undefined) {
	path = ''
    }

    this.resources = {mails:path + '/mails',
		      lists:path + '/lists'}
}

Lobby.prototype.listen = async function* (condition, order) {
    var websocket = new Websocket(this.resources.list + '/' + condition + '/' + order)
	
    try {
	for await (let identifiers of websocket) {
	    identifiers = JSON.stringify(identifiers)
	    for (let identifier of identifiers) {
		yield (await this.header(identifier))
	    }
	}
    }
    catch (e) {
	if (!(e instanceof ExpectedClose)) {
	    throw e
	}
    }
}

Lobby.prototype.list = async function *(condition, order) {
    let response = await fetch(this.resources.lists + '/' + condition + '/' + order)
    let identifiers = await response.json()

    for (let identifier of identifiers) {
	if (identifier !== null) {
	    let mail = await this.mail(identifier)
	    console.log('mail:', mail)
	    yield mail
	}
    }
}

Lobby.prototype.header = async function (identifier) {
    let response = await fetch(this.resources.mails + '/' + identifier)
    let text = await response.text()

    return InternetMessage.parse.header(text)
}

Lobby.prototype.mail = async function (identifier) {
    let response = await fetch(this.resources.mails + '/' + identifier)
    let text = await response.text()
    return InternetMessage.parse(text)
}
