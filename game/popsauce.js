module.exports = {
	settings: {},

	handler(client, data) {
		// Mise à jour des variables
		switch(data[0]) {
			case 'nextTurn':
				currentPlayerPeerId = data[1]
				break
			case 'setMilestone':
				playerStatesByPeerId = this.settings.milestone.playerStatesByPeerId
				currentPlayerPeerId = this.settings.milestone.currentPlayerPeerId

				if(this.settings.milestone.name == 'seating' && startStep > 0) {
					console.log("🥤 Partie réinitialisée !")

					client.emit("joinRound")
					return
				} else {
					startStep++
				}
				break
			case 'correctWord':
				playerStatesByPeerId[data[1].playerPeerId] = data[1]
				break
		}
	}
}