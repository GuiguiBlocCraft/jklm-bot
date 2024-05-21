const delay = require('timers/promises').setTimeout

let state = "seating"
let playerStatesByPeerId = {}
let lang = ""
let selfPeerId = 0

module.exports = {
	settings: {},

	async handler(client, data) {
		if(data.binary) return

		// Mise à jour des variables
		switch(data[0]) {
			case 'setMilestone':
				if(data[1].milestone) playerStatesByPeerId = data[1].milestone.playerStatesByPeerId ?? {}

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
			case 'setPlayerState':
				playerStatesByPeerId[data[1]] = data[2]
				break
			case 'setup':
				lang = data[1].rules.dictionaryId.value
				playerStatesByPeerId = data[1].milestone.playerStatesByPeerId ?? {}
				selfPeerId = data[1].selfPeerId
				break
			case 'setDictionary':
				lang = data[1].dictionaryId
				break
			case 'startChallenge':
				let question = data[1].prompt

				if(data[1].image) {
					console.log("Image detected")

					let { binary } = await client.awaitEvent(d => d.binary)

					let results = await fetch("http://192.168.1.27:5000/api/searchImage", {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							"Prompt": question,
							"Text": "",
							"ImageData": binary.toString('base64'),
							"ImageType": data[1].image.type,
							"Language": lang
						})
					})
						.then(a => a.json())
						.catch(() => {})

					if(!results) {
						console.error("❌ Une erreur s'est produite sur l'API")
						return
					}

					if(results.length === 0) {
						console.log("❌ Aucun résultat")
						return
					}

					console.log(results)

					for(let result of results) {
						client.emit("submitGuess", result.substring(0, 50))

						if(playerStatesByPeerId[selfPeerId]?.hasFoundSource)
							break

						await delay(100)
					}
				} else {
					console.log(data[1])
				}
				break
			case 'endChallenge':
				break
		}
	}
}