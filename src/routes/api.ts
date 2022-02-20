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

export { apiRoutes }
