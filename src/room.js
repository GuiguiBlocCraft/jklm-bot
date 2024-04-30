const Connection = require("./websocket")

class Room extends Connection {
	constructor() {
		super()
		this.type = 'room'
		this.gameSelector = null
	}

	setGame(selector) {
		this.gameSelector = selector
	}

	call_join() {
		var json = [
			'joinRoom',
			{
				roomCode: this.settings.roomCode,
				nickname: this.settings.nickname,
				language: "fr-FR",
				userToken: this.settings.userToken,
				token: this.settings.token
			}
		]

		this.connection.send('420' + JSON.stringify(json))
	}
}

module.exports = Room