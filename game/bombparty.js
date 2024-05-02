const fetch = require('node-fetch').default

let wordlist
let wordsExcluded = []
let lastWord
let syllable
let currentPlayerPeerId = 0
let playerStatesByPeerId = {}

let startStep = 0

fetch("https://raw.githubusercontent.com/chrplr/openlexicon/master/datasets-info/Liste-de-mots-francais-Gutenberg/liste.de.mots.francais.frgut.txt")
	.then(a => a.text())
	.then(a => wordlist = a.split("\n").map(a => strNoAccent(a.toLowerCase())))

module.exports = {
	settings: {},

	handler(client, data) {
		// Mise à jour des variables
		switch(data[0]) {
			case 'nextTurn':
				syllable = data[2]
				currentPlayerPeerId = data[1]
				break
			case 'clearUsedWords':
				startStep++
				break
			case 'setMilestone':
				syllable = this.settings.milestone.syllable
				playerStatesByPeerId = this.settings.milestone.playerStatesByPeerId
				currentPlayerPeerId = this.settings.milestone.currentPlayerPeerId

				if(this.settings.milestone.name == 'seating' && startStep > 0) {
					console.log("💣 Partie réinitialisée !")
					wordsExcluded = []
					startStep = 0

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

		if((data[0] == 'nextTurn' || data[0] == 'setMilestone' || data[0] == 'failWord') && currentPlayerPeerId === this.settings.selfPeerId && startStep >= 2) {
			if(data[0] == 'failWord') {
				console.log(`❌ Mot '${lastWord}' refusé par le serveur`)
				wordsExcluded.push(lastWord)
			}

			let player = playerStatesByPeerId[currentPlayerPeerId]
			let wordAnswers = wordlist.filter(str => str.includes(syllable) && !wordsExcluded.includes(str))

			let wordAnswersTmp = wordAnswers.filter(str => bonusLetters(player, str))

			if(wordAnswersTmp.length > 0)
				wordAnswers = wordAnswersTmp

			if(wordAnswers.length === 0) {
				console.log(`❌ Aucun mot trouvé concernant la syllabe '${syllable}'`)
				wordAnswers.push("/suicide")
			}

			let settings = this.settings
			let wordAnswer = wordAnswers[Math.floor(Math.random() * (wordAnswers.length - 1))]
			let timeIncrement = 0

			for(let n = 1; n <= wordAnswer.length; n++) {
				timeIncrement += 50 + Math.floor(Math.random() * 200)

				setTimeout(function() {
					if(currentPlayerPeerId !== settings.selfPeerId)
						return

					client.emit("setWord", wordAnswer.substring(0, n), false)

					if (n === wordAnswer.length) {
						client.emit("setWord", wordAnswer, true)
					}
				}, timeIncrement)
			}
		}

		if(data[0] == 'setPlayerWord') {
			lastWord = data[2]
		} else if(data[0] == 'correctWord') {
			let word = lastWord.split('').filter(a => (a.charCodeAt() >= 97 && a.charCodeAt() <= 122) || a == '-').join('')

			wordsExcluded.push(word)
			console.log(`✅ Mot utilisé : ${word} | ${wordsExcluded.length} mot(s) utilisé(s)`)
		}
	}
}

function strNoAccent(str) {
	return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function bonusLetters(player, word) {
	for (let letter of Object.getOwnPropertyNames(player.bonusLetters)) {
		if (player.bonusLetters[letter] === 1 && word.includes(letter))
			return true
	}

	return false
}