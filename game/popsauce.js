let state = "seating"

module.exports = {
	settings: {},

	handler(client, data) {
		// Mise à jour des variables
		switch(data[0]) {
			case 'setMilestone':
				if(!state) {
					state = this.settings.milestone.name
					break
				}

				if(state != this.settings.milestone.name) {
					if(this.settings.milestone.name == 'seating') {
						console.log("🥤 Partie réinitialisée !")

						client.emit("joinRound")
					} else if(this.settings.milestone.name == 'round') {
						console.log("🥤 La partie a commencé !")
					}

					state = this.settings.milestone.name
				}

				break
		}

		console.log(data)
	}
}