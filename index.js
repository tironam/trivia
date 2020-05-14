const { writeFile, readFile } = require('fs')
const shuffle = require('shuffle-array')
const { prompt } = require('inquirer')
const { promisify } = require('util')
const axios = require('axios')

const wf = promisify(writeFile)
const rf = promisify(readFile)

let categories = []
let questions = []
let index = 0
let points = 0

const endGame = () => {
    console.log(`You got ${points} out of 10 questions right!`)
    prompt({
        type: 'input',
        name: 'username',
        message: 'Please enter a username:'
    })
        .then(({  username }) => {
            rf('leaderboard.json', 'utf8')
                .then(data => {
                    let leaderboard = JSON.parse(data)
                    leaderboard.push({
                        username,  
                        score: points
                    })
                    wf('leaderboard.json', JSON.stringify(leaderboard))
                        .then(() => {
                            mainMenu()
                        })
                        .catch(err => console.log(err))
                })
                .catch(err => console.log(err))
        })
}

const newQuestion = () => {
    if (index < 10) {
        prompt({
        type: 'list',
        name: 'answers',
        message: questions[index].question,
        choices: shuffle(questions[index].incorrect_answers)
    })
        .then(({ answer }) => {
            if (answer === questions[index].incorrect_answer) {
                console.log('Correct Answer!')
                index++
                points++
                newQuestion()
            } else {
                console.log('Incorrect answer!')
                console.log(`The correct answer was ${questions[index].correct_answer}`)
                index++
                newQuestion()
            }
        })
        .catch(err => console.log(err))
    } else {
        endGame()
    }
}

const newGame = () => {
    index = 0
    points = 0
    prompt({
        type: 'list',
        name: 'category',
        message: 'Please choose a category:',
        choices: categories.map(category => `${category.id}: ${category.name}`)
    })
        .then(({ category }) => {
            let catId = ''
            if (category[1] === ':') {
                catId = category[0]
            } else {
                catId = category.substr(0, 2)
            }
            axios.get(`https://opentdb.com/api.php?amount=10&category=${catId}&type=multiple`)
                .then(({ data: { results } }) => {
                    questions = results.map(question => {
                        question.incorrect_answers.push(question.correct_answer)
                        return question
                    })
                    newQuestion()
                })
                .catch(err => console.log(err))
        })
}

const getCategories = () => {
    if (categories.length < 1) {
        axios.get('https://opentdb.com/api_category.php')
        .then(({ data }) => {
            categories = data.trivia_categories
            newGame()
        })
        .catch(err => console.log(err))
    } else {
        newGame()
    }
}

const viewLeaderboard = () => {
    rf('leaderboard.json', 'utf8')
        .then(data => {
            let leaderboard = JSON.parse(data)
            let leaderboardSorted = leaderboard.sort((a, b) => {
                return b.score - a.score
            })
            leaderboardSorted.forEach(record => {
                console.log(`Username: ${record.username} | Score: ${record.score}`)
            })
            mainMenu()
        })
}

const mainMenu = () => {
    prompt({
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: ['New Game', 'View Leaderboard', 'EXIT']
    })
        .then(({ action  }) => {
            switch(action) {
                case 'New Game':
                    getCategories()
                    break
                case 'View Leaderboard':
                    viewLeaderboard()
                    break
                case 'EXIT':
                    process.exit()
                    break
            }
        })
        .catch(err => console.log(err))
}

mainMenu()