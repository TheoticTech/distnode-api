// Third party
import express from 'express'

// Local
import { authMiddleware } from '../middleware/auth'
import { csrfMiddleware } from '../middleware/csrf'
import { uploadMiddleware } from '../middleware/upload'
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
        posts: results.records.map((r) => {
          const nodeVal = r.get('p')
          return { id: nodeVal.identity.low, ...nodeVal.properties }
        })
      })
    } catch (err) {
      return res.status(500).json({
        getPostError: 'An unknown error occurred, please try again later'
      })
    }
  }
)

apiRoutes.post(
  '/posts/add',
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
          addPostError: 'Missing title, body or visibility'
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
        addPostSuccess: 'Post created successfully'
      })
    } catch (err) {
      return res.status(500).json({
        addPostError: 'An unknown error occurred, please try again later'
      })
    }
  }
)

apiRoutes.post(
  '/media/upload',
  [authMiddleware, uploadMiddleware, csrfMiddleware],
  async (
    req: DefaultAPIRequest,
    res: express.Response
  ): Promise<express.Response> => {
    try {
      if (!req.file) {
        return res.status(400).json({
          mediaUploadError: 'Upload file must be provided'
        })
      } else {
        return res.status(201).json({
          mediaUploadSuccess: 'File uploaded successfully',
          file: req.file
        })
      }
    } catch (err) {
      res.status(500).send(err)
    }
  }
)

export { apiRoutes }
