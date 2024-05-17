let state = "seating"
let lang = ""

module.exports = {
	settings: {},

	async handler(client, data) {
		if(data.binary) return

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
			case 'setup':
				lang = data[1].rules.dictionaryId.value
				break
			case 'setDictionary':
				lang = data[1].dictionaryId
				break
			case 'startChallenge':
				if(data[1].image) {
					console.log("Image detected")

					let binary = await client.awaitEvent(d => d.binary)

					console.log(binary)
				} else {
					console.log(data[1])
				}

				console.log(`QUESTION: ${data[1].prompt}`)
				break
			case 'endChallenge':
				break
		}
	}
}