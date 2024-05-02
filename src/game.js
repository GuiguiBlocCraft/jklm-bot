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
		console.log("Jeu sélectionné : " + this.gameSelector)

		this.emit('joinGame', this.gameSelector, this.settings.roomCode, this.settings.userToken)
	}
}

module.exports = Game