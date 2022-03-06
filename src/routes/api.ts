// Third party
import express from 'express'

// Local
import { authMiddleware } from '../middleware/auth'

const apiRoutes = express.Router()

export interface DefaultAPIRequest extends express.Request {
  userID: string
}

apiRoutes.get(
  '/whoami',
  authMiddleware,
  (req: DefaultAPIRequest, res: express.Response): express.Response => {
    try {
      return res.status(200).send(req.userID)
    } catch (err) {
      return res.status(500).send('An error occurred')
    }
  }
)

apiRoutes.get(
  '/csrf-test',
  (req: DefaultAPIRequest, res: express.Response): express.Response => {
    try {
      console.log('req.headers', JSON.stringify(req.headers))
      console.log('req.cookies', JSON.stringify(req.cookies))
      console.log('req.body', JSON.stringify(req.body))
      return res.status(200).send('OK')
    } catch (err) {
      return res.status(500).send('An error occurred')
    }
  }
)

apiRoutes.post(
  '/csrf-test',
  (req: DefaultAPIRequest, res: express.Response): express.Response => {
    try {
      console.log('req.headers', JSON.stringify(req.headers))
      console.log('req.cookies', JSON.stringify(req.cookies))
      console.log('req.body', JSON.stringify(req.body))
      return res.status(200).send('OK')
    } catch (err) {
      return res.status(500).send('An error occurred')
    }
  }
)

export { apiRoutes }
