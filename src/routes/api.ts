// Third party
import express from 'express'
import sanitizeHtml from 'sanitize-html'

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
      const { title, body } = req.body

      if (!title) {
        return res.status(400).json({
          addPostError: 'Post title must not be empty'
        })
      }

      if (!body) {
        return res.status(400).json({
          addPostError: 'Post body must not be empty'
        })
      }

      const sanitizedBody = sanitizeHtml(body, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat([
          'img',
          'iframe',
          'video',
          'audio',
          'source'
        ]),
        allowedAttributes: {
          img: [ 'src', 'width', 'height' ],
          iframe: [ 'src', 'width', 'height', 'frameborder', 'allowfullscreen' ],
          video: [ 'controls', 'width', 'height' ],
          audio: [ 'controls', 'src' ],
          source: [ 'src', 'type' ],
          span: [ 'style' ],
          p: [ 'style' ]
        },
        allowedIframeHostnames: ['www.youtube.com'],
        disallowedTagsMode: 'escape',
        selfClosing: [ 'img', 'source' ],
        allowedSchemesByTag: {
          img: [ 'https' ]
        },
        allowedStyles: {
          '*': {
            'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
            'text-decoration': [/^underline$/],
            'padding-left': [/[0-9]{1,4}px$/]
          },
          'span': {
            'background-color': [/^rgb\([0-9]{0,3}, [0-9]{0,3}, [0-9]{0,3}\)$/]
          }
        }
      })

      await queryNeo4j(
        req.app.locals.driver,
        'MATCH (u:User {userID: $userID}) ' +
          'CREATE (p:Post {title: $title, body: $sanitizedBody})' +
          '-[:POSTED_BY]->(u) ' +
          'RETURN p',
        { userID, title, sanitizedBody }
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
