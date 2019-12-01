const Redis = require('ioredis')
const clc = require('cli-color')

class PubSub {
  constructor () {
    const options = { port: Number(process.env.REDIS_PORT), host: process.env.REDIS_HOST }

    this.redis = new Redis(options)
    this.subscriber = new Redis(options)

    this.subscriber.subscribe('__keyevent@0__:expired')

    this.subscriber.on('message', async (channel, message) => {
      if (channel === '__keyevent@0__:expired') {
        if (message === 'todo:next') {
          const [key] = await this.redis.zpopmin('todos')
          await this.setNextReminder()

          if (key) {
            await this.showTodo(key)
          } else {
            console.log(clc.bgRed.whiteBright('Error: key not found, unexpected loss of data'))
          }
        }
      }
    })

    this.redis.on('error', (err) => {
      console.log(clc.bgRed.whiteBright(err))
    })

    this.redis.on('ready', async () => {
      console.log(clc.cyanBright('redis ready, port:', options.port))
      this.redis.config('SET', 'notify-keyspace-events', 'Ex')

      await this.showPastReminders()
    })
  }

  async showTodo (key, overDue = false) {
    const todos = await this.redis.lrange(`todos:${key}`, 0, -1)
    const dueDate = new Date(parseInt(key)).toLocaleTimeString()
    const colorize = overDue ? clc.yellowBright : clc.greenBright
    todos.forEach((element, i) => {
      console.log(colorize(`[${i + 1}]`, dueDate, element))
    })
    this.redis.del(`todos:${key}`)
  }

  async showPastReminders () {
    const currentTime = new Date().getTime()
    const pastTodos = await this.redis.zrangebyscore('todos', '0', `${currentTime}`)
    if (pastTodos.length > 0) {
      for (const key of pastTodos) {
        await this.showTodo(key, true)
      }
      // remove from set
      await this.redis.zremrangebyscore('todos', 0, currentTime)
      await this.setNextReminder()
    }
  }

  async getNext () {
    const rangeOfFirstTodo = await this.redis.zrange('todos', 0, 0)

    if (!rangeOfFirstTodo || rangeOfFirstTodo.length === 0) {
      return
    }
    return rangeOfFirstTodo[0]
  }

  async setNextReminder () {
    const minKey = await this.getNext()
    if (!minKey) {
      return
    }

    await this.redis
      .multi()
      .set('todo:next', `${minKey}`)
      .pexpireat('todo:next', Number(minKey))
      .bgsave()
      .exec()
  }

  async addTodo (time, todo) {
    const dueDate = new Date(parseInt(time) * 1000)
    if (!(dueDate instanceof Date && !isNaN(dueDate))) {
      throw new Error('invalid trigger date' + time)
    } else if (new Date() >= dueDate) {
      throw new Error('trigger date must be in the future, ' + dueDate.toLocaleTimeString())
    }

    const key = dueDate.getTime()

    await this.redis
      .multi()
      .rpush(`todos:${key}`, `${todo}`)
      .zadd('todos', `${key}`, `${key}`)
      .bgsave()
      .exec()

    await this.setNextReminder()

    return `added todo at: ${dueDate.toLocaleTimeString()} [${key}]`
  }
}

module.exports = PubSub
