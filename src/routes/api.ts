// Third party
import express from 'express'
import sanitizeHtml from 'sanitize-html'

// Local
import { authMiddleware } from '../middleware/auth'
import { csrfMiddleware } from '../middleware/csrf'
import { uploadMiddleware } from '../middleware/upload'
import queryNeo4j from '../utils/queryNeo4j'

// Configurations
import { DO_SPACE_ENDPOINT, DO_SPACE_BUCKET } from '../config'

const apiRoutes = express.Router()

export interface DefaultAPIRequest extends express.Request {
  userID: string
}

// Obtain current user's ID
apiRoutes.get(
  '/user/id/',
  authMiddleware,
  async (
    req: DefaultAPIRequest,
    res: express.Response
  ): Promise<express.Response> => {
    try {
      const { userID } = req

      if (!userID) {
        return res.status(400).json({
          authError: 'User is not authenticated'
        })
      }

      return res.status(200).json({
        getUserIDSuccess: 'User ID obtained successfully',
        userID
      })
    } catch (err) {
      return res.status(500).json({
        getUserIDError: 'An unknown error occurred, please try again later'
      })
    }
  }
)

// Obtain newest posts
apiRoutes.get(
  '/posts/',
  async (
    req: DefaultAPIRequest,
    res: express.Response
  ): Promise<express.Response> => {
    try {
      const results = await queryNeo4j(
        req.app.locals.driver,
        'MATCH (p:Post)--(u:User) return p, u ORDER BY p.created_at DESC',
        {}
      )

      return res.status(200).json({
        getPostsSuccess: 'Posts obtained successfully',
        posts: results.records.map((r) => {
          const nodePostVal = r.get('p')
          const nodeUserVal = r.get('u')
          return {
            userID: nodeUserVal.properties.userID,
            username: nodeUserVal.properties.username,
            avatar: nodeUserVal.properties.avatar,
            postID: nodePostVal.identity.low,
            postCreatedAt: nodePostVal.properties.created_at.toNumber(),
            description: nodePostVal.properties.description,
            title: nodePostVal.properties.title
          }
        })
      })
    } catch (err) {
      console.error(err)
      return res.status(500).json({
        getPostsError: 'An unknown error occurred, please try again later'
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
      const { title, description, body } = req.body

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

      if (!description) {
        return res.status(400).json({
          addPostError: 'Post description must not be empty'
        })
      }

      const sanitizedBody = sanitizeHtml(body, {
        allowedAttributes: {
          iframe: ['src', 'width', 'height', 'frameborder', 'allowfullscreen'],
          img: ['src', 'width', 'height'],
          audio: ['controls', 'src'],
          video: ['controls', 'width', 'height', 'src', 'poster'],
          span: ['style'],
          p: ['style']
        },
        allowedIframeHostnames: ['www.youtube.com'],
        allowedSchemesByTag: {
          img: ['https'],
          iframe: ['https'],
          video: ['https'],
          audio: ['https']
        },
        allowedStyles: {
          '*': {
            'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
            'text-decoration': [/^underline$/],
            'padding-left': [/[0-9]{1,4}px$/]
          },
          span: {
            'background-color': [/^rgb\([0-9]{0,3}, [0-9]{0,3}, [0-9]{0,3}\)$/]
          }
        },
        allowedTags: sanitizeHtml.defaults.allowedTags.concat([
          'iframe',
          'img',
          'audio',
          'video'
        ]),
        disallowedTagsMode: 'escape',
        exclusiveFilter: (frame) => {
          // Only allow images, audio, and video tags with DistNode static src
          if (
            frame.tag === 'img' ||
            frame.tag === 'audio' ||
            frame.tag === 'video'
          ) {
            const re = new RegExp(
              `^(https:\\/\\/${DO_SPACE_BUCKET}\\.${DO_SPACE_ENDPOINT.replace(
                '.',
                '\\.'
              )}\\/uploads\\/([A-Za-z0-9\\-\\._~:\\/\\?#\\[\\]@!$&'\\(\\)\\*\\+,;\\=]*)?)$`
            )
            if (!re.test(frame.attribs.src)) {
              console.log('Filtering out', frame.attribs.src)
            }
            return !re.test(frame.attribs.src)
          }
        },
        selfClosing: ['img', 'audio', 'video']
      })

      await queryNeo4j(
        req.app.locals.driver,
        'MATCH (u:User {userID: $userID}) ' +
          'CREATE (p:Post {' +
          'title: $title, ' +
          'description: $description, ' +
          'body: $sanitizedBody, ' +
          'created_at: TIMESTAMP()' +
          '})' +
          '-[:POSTED_BY]->(u) ' +
          'RETURN p',
        { userID, title, description, sanitizedBody }
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
  '/user/:userID/profile/edit',
  [authMiddleware, csrfMiddleware],
  async (
    req: DefaultAPIRequest,
    res: express.Response
  ): Promise<express.Response> => {
    try {
      const { userID } = req
      const { bio, avatar } = req.body

      if (!bio && !avatar) {
        return res.status(400).json({
          editProfileError: 'Either bio or avatar must be provided'
        })
      }

      if (userID !== req.params.userID) {
        return res.status(403).json({
          editProfileError: 'Not authorized to edit this profile'
        })
      }

      const setBioQueryString = bio ? 'u.bio = $bio' : ''
      const setAvatarQueryString = avatar ? 'u.avatar = $avatar' : ''

      const setQueryString = [setBioQueryString, setAvatarQueryString]
        .filter((s) => s !== '')
        .join(', ')

      await queryNeo4j(
        req.app.locals.driver,
        'MATCH (u:User {userID: $userID}) SET ' + setQueryString + ' RETURN u',
        { userID, bio, avatar }
      )
      return res.status(200).json({
        editProfileSuccess: 'Profile edited successfully'
      })
    } catch (err) {
      console.error(err)
      return res.status(500).json({
        editProfileError: 'An unknown error occurred, please try again later'
      })
    }
  }
)

// Obtain supplied user's info (without posts)
apiRoutes.get(
  '/user/:userID',
  async (
    req: DefaultAPIRequest,
    res: express.Response
  ): Promise<express.Response> => {
    try {
      const userID = req.params.userID

      const results = await queryNeo4j(
        req.app.locals.driver,
        'MATCH (u:User {userID: $userID}) return u',
        { userID }
      )

      if (results.records.length === 0) {
        return res.status(404).json({
          getUserError: 'User not found'
        })
      }

      return res.status(200).json({
        getUserSuccess: 'User info obtained successfully',
        user: {
          userID: results.records[0].get('u').properties.userID,
          username: results.records[0].get('u').properties.username,
          userCreatedAt: results.records[0]
            .get('u')
            .properties.created_at.toNumber(),
          bio: results.records[0].get('u').properties.bio,
          avatar: results.records[0].get('u').properties.avatar
        }
      })
    } catch (err) {
      console.log(err)
      return res.status(500).json({
        getUserError: 'An unknown error occurred, please try again later'
      })
    }
  }
)

// Obtain supplied user's info and posts
apiRoutes.get(
  '/user/:userID/profile',
  async (
    req: DefaultAPIRequest,
    res: express.Response
  ): Promise<express.Response> => {
    try {
      const userID = req.params.userID

      const results = await queryNeo4j(
        req.app.locals.driver,
        'MATCH (u:User {userID: $userID}) ' +
          'OPTIONAL MATCH (p:Post)-[r:POSTED_BY]->(u) ' +
          'return p, u ORDER BY p.created_at DESC',
        { userID }
      )

      if (results.records.length === 0) {
        return res.status(404).json({
          getUserProfileError: 'User not found'
        })
      }

      const user = {
        userID: results.records[0].get('u').properties.userID,
        username: results.records[0].get('u').properties.username,
        userCreatedAt: results.records[0]
          .get('u')
          .properties.created_at.toNumber(),
        bio: results.records[0].get('u').properties.bio,
        avatar: results.records[0].get('u').properties.avatar
      }

      return res.status(200).json({
        getUserProfileSuccess: 'Profile components obtained successfully',
        user,
        posts: results.records
          .filter((r) => r.get('p'))
          .map((r) => {
            const nodePostVal = r.get('p')
            // We'll keep user info in the post object for PostFeed
            return {
              userID: user.userID,
              username: user.username,
              bio: user.bio,
              avatar: user.avatar,
              postID: nodePostVal.identity.low,
              postCreatedAt: nodePostVal.properties.created_at.toNumber(),
              description: nodePostVal.properties.description,
              title: nodePostVal.properties.title
            }
          })
      })
    } catch (err) {
      console.log(err)
      return res.status(500).json({
        getUserProfileError: 'An unknown error occurred, please try again later'
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
