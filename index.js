
const express = require('express')
const PubSub = require('./pubsub')

const app = express()
const pubsub = new PubSub()

if (process.env.REDIRECT_CONSOLE) {
  console.log = function (d) {
    process.stdout.write('\n' + d + '\n')
  }
}

app.get('/echoAtTime', async (req, res) => {
  let result
  try {
    const { time, message } = req.query
    result = await pubsub.addTodo(time, message)
  } catch (error) {
    result = error
  } finally {
    console.log(result)

    if (result.constructor.name === 'Error') {
      res.status(400).json({ error: result.message })
    } else if (result && typeof result === 'string') {
      res.json({ result: result })
    } else {
      res.status(500).json({ error: 'Unexpected Error' })
    }
  }
})

const port = process.env.NODE_PORT
app.listen(port, () => console.log('Node server listening, port:', port))
