const Connection = require("./websocket")

class Game extends Connection {
	constructor() {
		super()
		this.type = 'game'
		this.gameSelector = null
	}

	setGame(selector) {
		this.gameSelector = selector
	}

	call_join() {
		console.log("Jeu modifié : " + this.gameSelector)

		var json = [
			'joinGame',
			this.gameSelector,
			this.settings.roomCode,
			this.settings.userToken
		]

		this.connection.send('42' + JSON.stringify(json))
	}
}

module.exports = Game