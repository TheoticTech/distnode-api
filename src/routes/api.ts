// Third party
import express from 'express'

// Local
import { authMiddleware } from '../middleware/auth'
import { csrfMiddleware } from '../middleware/csrf'
import queryNeo4j from '../utils/queryNeo4j'

const apiRoutes = express.Router()

export interface DefaultAPIRequest extends express.Request {
  userID: string
}

// Obtain current user's posts
apiRoutes.get(
  '/posts/',
  authMiddleware,
  async (
    req: DefaultAPIRequest,
    res: express.Response
  ): Promise<express.Response> => {
    try {
      const { userID } = req

      const results = await queryNeo4j(
        req.app.locals.driver,
        'MATCH (p:Post)-[:POSTED_BY]->(u:User {userID: $userID}) return p',
        { userID }
      )

      return res.status(200).json({
        getPostsSuccess: 'Post obtained successfully',
        posts: results.records.map((r) => r.get('p').properties)
      })
    } catch (err) {
      return res.status(500).json({
        createPostError: 'An unknown error occurred, please try again later'
      })
    }
  }
)

apiRoutes.post(
  '/posts/create',
  [authMiddleware, csrfMiddleware],
  async (
    req: DefaultAPIRequest,
    res: express.Response
  ): Promise<express.Response> => {
    try {
      const { userID } = req
      const { title, body, visibility } = req.body

      if (!title || !body || !visibility) {
        return res.status(400).json({
          createPostError: 'Missing title, body or visibility'
        })
      }

      await queryNeo4j(
        req.app.locals.driver,
        'MATCH (u:User {userID: $userID}) ' +
        'CREATE (p:Post {title: $title, body: $body, visibility: $visibility})' +
        '-[:POSTED_BY]->(u) ' +
        'RETURN p',
        { userID, title, body, visibility }
      )
      return res.status(200).json({
        createPostSuccess: 'Post created successfully'
      })
    } catch (err) {
      return res.status(500).json({
        createPostError: 'An unknown error occurred, please try again later'
      })
    }
  }
)

export { apiRoutes }
