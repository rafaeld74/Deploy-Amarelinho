import fastify from 'fastify'
import { usersRoutes } from './routes/users'
import fastifyCookie from '@fastify/cookie'

const app = fastify()

app.register(fastifyCookie)

app.register(usersRoutes, {
  prefix: 'users',
})

export default app