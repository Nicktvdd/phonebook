require('dotenv').config()
const express = require('express')
const app = express()
const Person = require('./models/person')
const morgan = require('morgan')
const cors = require('cors')

const requestLogger = (request, response, next) => {
  console.log('Method:', request.method)
  console.log('Path:  ', request.path)
  console.log('Body:  ', request.body)
  console.log('---')
  next()
}

//---------------------------------use---------------------------------------------

app.use(cors())
app.use(express.static('dist'))
app.use(express.json())
app.use(requestLogger)
app.use(morgan((tokens, req, res) => {
  return [
    tokens.method(req, res),
    tokens.url(req, res),
    tokens.status(req, res),
    tokens.res(req, res, 'content-length'), '-',
    tokens['response-time'](req, res), 'ms',
    JSON.stringify(req.body)
  ].join(' ')
}))

//--------------------------------get---------------------------------------------

app.get('/', (req, res) => {
  res.send('<h1>Welcome to the ultimate phonebook in Node.js</h1>')
})

app.get('/info', (request, response) => {
  Person.countDocuments({})
    .then(count => {
      response.send(`Phonebook has info for ${count} persons<br/>${new Date()}`)
    })
    .catch(error => {
      console.error(error)
      response.status(500).send('Error while fetching data')
    })
})

app.get('/api/persons', (request, response) => {
  Person.find({}).then(persons => {
    response.json(persons)
  })
})

app.get('/api/persons/:id', (request, response, next) => {
  Person.findById(request.params.id)
    .then(person => {
      if (person) {
        response.json(person)
      } else {
        response.status(404).end()
      }
    })
    .catch(error => next(error))
})

//------------------------------post-----------------------------------------------

app.post('/api/persons', (request, response, next) => {
  const body = request.body

  if (!body || !body.name || !body.number) {
    return response.status(400).json({
      error: 'Phonebook data insertion failed, data seems to be missing. If you have forgotten your name, please seek medical help'
    })
  }

  Person.findOne({ name: body.name })
    .then(existingPerson => {
      if (!existingPerson) {
        const person = new Person({
          name: body.name,
          number: body.number
        })
        person.save()
          .then(newPerson => {
            response.json(newPerson)
          })
          .catch(error => next(error))
      }
    })
    .catch(error => next(error))
})

//------------------------------put-----------------------------------------------

app.put('/api/persons/:id', (request, response, next) => {
  const id = request.params.id
  const body = request.body

  const updatedPerson = {
    name: body.name,
    number: body.number
  }
  Person.findByIdAndUpdate(id, updatedPerson, { new: true, runValidators: true, context: 'query' })
    .then(updatedPerson => {
      response.json(updatedPerson)
    })
    .catch(error => next(error))
})

//--------------------------------delete-------------------------------------------

app.delete('/api/persons/:id', (request, response, next) => { // Added 'next' parameter
  const id = request.params.id

  Person.findByIdAndRemove(id)
    .then(() => {
      response.status(204).end()
    })
    .catch(error => next(error))
})

//--------------------------------error-------------------------------------------

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' })
}

app.use(unknownEndpoint)

const errorHandler = (error, request, response, next) => {
  console.error(error.message)

  if (error.name === 'CastError') {
    return response.status(400).send({ error: 'malformatted id' })
  } else if (error.name === 'ValidationError') {
    return response.status(400).json({ error: error.message })
  }
  next(error)
}

app.use(errorHandler)

//------------------------------listen-----------------------------------------------
const PORT = process.env.PORT
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
