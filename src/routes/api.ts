// Third party
import axios from 'axios'
import express, { response } from 'express'
import { parse } from 'node-html-parser'
import imageType from 'image-type'

// Local
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth'
import { csrfMiddleware } from '../middleware/csrf'
import { Reactions } from '../types/Reactions'
import { sanitizeBody } from '../utils/sanitize'
import { uploadMiddleware } from '../middleware/upload'
import queryNeo4j from '../utils/queryNeo4j'
import uploadDirect from '../utils/uploadDirect'

// Configurations
import { PRERENDER_SERVER } from '../config'

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

// Obtain post by ID
apiRoutes.get(
  '/post/:postID/',
  optionalAuthMiddleware,
  async (
    req: DefaultAPIRequest,
    res: express.Response
  ): Promise<express.Response> => {
    try {
      const { userID = 'DNE' } = req
      const { postID } = req.params

      const results = await queryNeo4j(
        req.app.locals.driver,
        'MATCH (p:Post)-[:POSTED_BY]->(u:User) ' +
          'WHERE id(p) = $postID ' +
          'OPTIONAL MATCH (activeUser:User {userID: $userID}) ' +
          'OPTIONAL MATCH (activeUser)-[:ReactionFrom]->(r:Reaction)-[:ReactionTo]->(p) ' +
          'RETURN p, u, r',
        { userID, postID: parseInt(postID) }
      )

      if (results.records.length === 0) {
        return res.status(404).json({
          getPostError: 'Post not found'
        })
      }

      const nodePostVal = results.records[0].get('p')
      const nodeUserVal = results.records[0].get('u')
      const nodeReactionVal = results.records[0].get('r')
      const reaction = nodeReactionVal ? nodeReactionVal.properties.type : null

      return res.status(200).json({
        getPostSuccess: 'Posts obtained successfully',
        user: {
          userID: nodeUserVal.properties.userID,
          username: nodeUserVal.properties.username,
          createdAt: nodeUserVal.properties.created_at.toNumber(),
          bio: nodeUserVal.properties.bio,
          avatar: nodeUserVal.properties.avatar
        },
        post: {
          postID: nodePostVal.identity.low,
          createdAt: nodePostVal.properties.created_at.toNumber(),
          ...(nodePostVal.properties.updated_at && {
            updatedAt: nodePostVal.properties.updated_at.toNumber()
          }),
          ...(reaction && { reaction }),
          description: nodePostVal.properties.description,
          title: nodePostVal.properties.title,
          body: nodePostVal.properties.body,
          thumbnail: nodePostVal.properties.thumbnail,
          published: nodePostVal.properties.published,
          ...(reaction && { reaction })
        }
      })
    } catch (err) {
      console.error(err)
      return res.status(500).json({
        getPostError: 'An unknown error occurred, please try again later'
      })
    }
  }
)

// Obtain post comments by post ID
apiRoutes.get(
  '/post/:postID/comments',
  async (
    req: DefaultAPIRequest,
    res: express.Response
  ): Promise<express.Response> => {
    try {
      const { postID } = req.params

      const results = await queryNeo4j(
        req.app.locals.driver,
        'MATCH (p:Post) ' +
          'WHERE id(p) = $postID ' +
          'OPTIONAL MATCH (rootComment:Comment)-[:CommentTo]->(p) ' +
          'OPTIONAL MATCH (rootCommentFrom:User)-[:CommentFrom]->(rootComment) ' +
          'OPTIONAL MATCH (replyComment:Comment)-[commentToCommentRelationship:CommentTo *0..7]->(rootComment) ' +
          'OPTIONAL MATCH (replyCommentFrom:User)-[:CommentFrom *0..7]->(replyComment) ' +
          'RETURN rootComment, rootCommentFrom, replyComment, replyCommentFrom, commentToCommentRelationship',
        { postID: parseInt(postID) }
      )

      if (results.records.length === 0) {
        return res.status(404).json({
          getCommentsError: 'Post not found'
        })
      }

      const commentVals = results.records.map((r) => {
        const rootCommentVal = r.get('rootComment')
        const rootCommentFromVal = r.get('rootCommentFrom')
        const replyCommentVal = r.get('replyComment')
        const replyCommentFromVal = r.get('replyCommentFrom')
        const commentToCommentRelationshipVal = r.get(
          'commentToCommentRelationship'
        )
        return {
          ...(rootCommentVal && {
            rootComment: {
              ...rootCommentVal,
              created_at: rootCommentVal.properties.created_at.toNumber()
            }
          }),
          ...(rootCommentFromVal && {
            rootCommentFrom: {
              userID: rootCommentFromVal.properties.userID,
              username: rootCommentFromVal.properties.username,
              avatar: rootCommentFromVal.properties.avatar
            }
          }),
          ...(replyCommentVal && {
            replyComment: {
              ...replyCommentVal,
              created_at: replyCommentVal.properties.created_at.toNumber()
            }
          }),
          ...(replyCommentFromVal && {
            replyCommentFrom: {
              userID: replyCommentFromVal.properties.userID,
              username: replyCommentFromVal.properties.username,
              avatar: replyCommentFromVal.properties.avatar
            }
          }),
          ...(commentToCommentRelationshipVal && {
            commentToCommentRelationship: commentToCommentRelationshipVal
          })
        }
      })

      return res.status(200).json({
        getCommentsSuccess: 'Comments obtained successfully',
        ...(commentVals.every((cv) => Object.keys(cv).length > 0) && {
          comments: commentVals
        })
      })
    } catch (err) {
      console.error(err)
      return res.status(500).json({
        getCommentsError: 'An unknown error occurred, please try again later'
      })
    }
  }
)

// Obtain posts created by same author as post with provided ID
apiRoutes.get(
  '/post/:postID/related/author',
  optionalAuthMiddleware,
  async (
    req: DefaultAPIRequest,
    res: express.Response
  ): Promise<express.Response> => {
    try {
      const { userID = 'DNE' } = req
      const { postID } = req.params

      const results = await queryNeo4j(
        req.app.locals.driver,
        'MATCH (p:Post)-[:POSTED_BY]->(u:User) WHERE id(p) = $postID ' +
          'MATCH (po: Post)-[:POSTED_BY]->(u:User) WHERE id(po) <> id(p) ' +
          'AND po.published <> false ' +
          'OPTIONAL MATCH (activeUser:User {userID: $userID}) ' +
          'OPTIONAL MATCH (activeUser)-[:ReactionFrom]->(r:Reaction)-[:ReactionTo]->(po) ' +
          'return po, u, r LIMIT 6',
        { postID: parseInt(postID), userID }
      )

      return res.status(200).json({
        getPostsSuccess: 'Posts obtained successfully',
        posts: results.records.map((r) => {
          const nodePostVal = r.get('po')
          const nodeUserVal = r.get('u')
          const nodeReactionVal = r.get('r')
          const reaction = nodeReactionVal
            ? nodeReactionVal.properties.type
            : null
          return {
            userID: nodeUserVal.properties.userID,
            username: nodeUserVal.properties.username,
            avatar: nodeUserVal.properties.avatar,
            postID: nodePostVal.identity.low,
            postCreatedAt: nodePostVal.properties.created_at.toNumber(),
            description: nodePostVal.properties.description,
            title: nodePostVal.properties.title,
            thumbnail: nodePostVal.properties.thumbnail,
            published: nodePostVal.properties.published,
            ...(reaction && { reaction })
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

// Obtain newest posts
apiRoutes.post(
  '/posts/',
  optionalAuthMiddleware,
  async (
    req: DefaultAPIRequest,
    res: express.Response
  ): Promise<express.Response> => {
    try {
      const { userID = 'DNE' } = req
      const { currentPosts } = req.body

      if (userID) {
        const results = await queryNeo4j(
          req.app.locals.driver,
          'MATCH (p:Post)-[:POSTED_BY]->(u:User) ' +
            'WHERE NOT(ID(p) IN $currentPosts) ' +
            'AND p.published <> false ' +
            'OPTIONAL MATCH (activeUser:User {userID: $userID}) ' +
            'OPTIONAL MATCH (activeUser)-[:ReactionFrom]->(r:Reaction)-[:ReactionTo]->(p) ' +
            'OPTIONAL MATCH (allReactions: Reaction)-[art: ReactionTo]->(p) ' +
            'return p, u, r, sum( ' +
            'case allReactions.type ' +
            'when "Like" then 1 ' +
            'when "Dislike" then -1 ' +
            'else 0 ' +
            'end ' +
            ')/((p.created_at - timestamp())^2) as score ' +
            'ORDER BY score DESC, p.created_at DESC ' +
            'LIMIT 9',
          { currentPosts, userID }
        )

        return res.status(200).json({
          getPostsSuccess: 'Posts obtained successfully',
          posts: results.records.map((r) => {
            const nodePostVal = r.get('p')
            const nodeUserVal = r.get('u')
            const nodeReactionVal = r.get('r')
            const nodeScoreVal = r.get('score')
            const reaction = nodeReactionVal
              ? nodeReactionVal.properties.type
              : null
            return {
              userID: nodeUserVal.properties.userID,
              username: nodeUserVal.properties.username,
              avatar: nodeUserVal.properties.avatar,
              postID: nodePostVal.identity.low,
              postCreatedAt: nodePostVal.properties.created_at.toNumber(),
              description: nodePostVal.properties.description,
              title: nodePostVal.properties.title,
              thumbnail: nodePostVal.properties.thumbnail,
              published: nodePostVal.properties.published,
              score: nodeScoreVal,
              ...(reaction && { reaction })
            }
          })
        })
      } else {
        const results = await queryNeo4j(
          req.app.locals.driver,
          'MATCH (p:Post)-[:POSTED_BY]->(u:User) ' +
            'WHERE NOT(ID(p) IN $currentPosts) ' +
            'AND p.published <> false ' +
            'OPTIONAL MATCH (allReactions: Reaction)-[art: ReactionTo]->(p) ' +
            'return p, u, sum( ' +
            'case allReactions.type ' +
            'when "Like" then 1 ' +
            'when "Dislike" then -1 ' +
            'else 0 ' +
            'end ' +
            ')/((p.created_at - timestamp())^2) as score ' +
            'ORDER BY score DESC, p.created_at DESC ' +
            'LIMIT 9',
          { currentPosts }
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
              title: nodePostVal.properties.title,
              thumbnail: nodePostVal.properties.thumbnail,
              published: nodePostVal.properties.published
            }
          })
        })
      }
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
      const { title, description, body, thumbnail, published } = req.body

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

      const sanitizedBody = sanitizeBody(body)

      await queryNeo4j(
        req.app.locals.driver,
        'MATCH (u:User {userID: $userID}) ' +
          'CREATE (p:Post {' +
          'title: $title, ' +
          'description: $description, ' +
          'body: $sanitizedBody, ' +
          `${thumbnail ? 'thumbnail: $thumbnail, ' : ''}` +
          'published: $published, ' +
          'created_at: TIMESTAMP()' +
          '})' +
          '-[:POSTED_BY]->(u) ' +
          'RETURN p',
        { userID, title, description, sanitizedBody, thumbnail, published }
      )
      return res.status(200).json({
        addPostSuccess: 'Post created successfully'
      })
    } catch (err) {
      console.error(err)
      return res.status(500).json({
        addPostError: 'An unknown error occurred, please try again later'
      })
    }
  }
)

apiRoutes.post(
  '/posts/edit/:postID',
  [authMiddleware, csrfMiddleware],
  async (
    req: DefaultAPIRequest,
    res: express.Response
  ): Promise<express.Response> => {
    try {
      const { userID } = req
      const { title, description, body, thumbnail, published } = req.body
      const { postID } = req.params

      if (!title) {
        return res.status(400).json({
          editPostError: 'Post title must not be empty'
        })
      }

      if (!body) {
        return res.status(400).json({
          editPostError: 'Post body must not be empty'
        })
      }

      if (!description) {
        return res.status(400).json({
          editPostError: 'Post description must not be empty'
        })
      }

      const results = await queryNeo4j(
        req.app.locals.driver,
        'MATCH (p:Post)-[:POSTED_BY]->(u:User) WHERE id(p) = $postID return p, u',
        { postID: parseInt(postID) }
      )

      if (results.records.length === 0) {
        return res.status(404).json({
          editPostError: 'Post not found'
        })
      }

      const nodeUserVal = results.records[0].get('u')

      if (nodeUserVal.properties.userID !== userID) {
        return res.status(403).json({
          editPostError: 'You are not authorized to edit this post'
        })
      }

      const sanitizedBody = sanitizeBody(body)

      await queryNeo4j(
        req.app.locals.driver,
        'MATCH (p:Post) WHERE id(p) = $postID SET ' +
          'p.title = $title, ' +
          'p.description = $description, ' +
          'p.body = $sanitizedBody, ' +
          'p.updated_at = TIMESTAMP(), ' +
          'p.published = $published ' +
          `${thumbnail ? ', p.thumbnail = $thumbnail ' : ' '}` +
          'RETURN p',
        {
          postID: parseInt(postID),
          title,
          description,
          sanitizedBody,
          thumbnail,
          published
        }
      )
      return res.status(200).json({
        editPostSuccess: 'Post edited successfully'
      })
    } catch (err) {
      console.error(err)
      return res.status(500).json({
        editPostError: 'An unknown error occurred, please try again later'
      })
    }
  }
)

apiRoutes.delete(
  '/posts/delete/:postID',
  [authMiddleware, csrfMiddleware],
  async (
    req: DefaultAPIRequest,
    res: express.Response
  ): Promise<express.Response> => {
    try {
      const { userID } = req
      const { postID } = req.params

      const results = await queryNeo4j(
        req.app.locals.driver,
        'MATCH (p:Post)-[:POSTED_BY]->(u:User) WHERE id(p) = $postID return p, u',
        { postID: parseInt(postID) }
      )

      if (results.records.length === 0) {
        return res.status(404).json({
          deletePostError: 'Post not found'
        })
      }

      const nodeUserVal = results.records[0].get('u')

      if (nodeUserVal.properties.userID !== userID) {
        return res.status(403).json({
          deletePostError: 'You are not authorized to delete this post'
        })
      }

      await queryNeo4j(
        req.app.locals.driver,
        'MATCH (p:Post) WHERE id(p) = $postID ' + 'DETACH DELETE p',
        { postID: parseInt(postID) }
      )

      return res.status(200).json({
        deletePostSuccess: 'Post deleted successfully'
      })
    } catch (err) {
      console.error(err)
      return res.status(500).json({
        deletePostError: 'An unknown error occurred, please try again later'
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
      const { userID } = req // From auth middleware
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

apiRoutes.post(
  '/posts/:postID/react',
  [authMiddleware],
  async (
    req: DefaultAPIRequest,
    res: express.Response
  ): Promise<express.Response> => {
    try {
      const { userID } = req // From auth middleware
      const { postID } = req.params
      const { reaction } = req.body

      if (!reaction || !Object.keys(Reactions).includes(reaction)) {
        return res.status(400).json({
          reactionError: 'A valid reaction must be provided'
        })
      }

      const currentReaction = await queryNeo4j(
        req.app.locals.driver,
        'MATCH (p:Post) WHERE id(p) = $postID ' +
          'OPTIONAL MATCH (u:User {userID: $userID})' +
          '-[rf:ReactionFrom]->(r:Reaction)-[:ReactionTo]->' +
          '(p) RETURN r',
        { userID, postID: parseInt(postID), reaction }
      )

      if (currentReaction.records[0].get('r')) {
        // Delete existing reaction
        await queryNeo4j(
          req.app.locals.driver,
          'MATCH (p:Post) WHERE id(p) = $postID ' +
            'OPTIONAL MATCH (u:User {userID: $userID})' +
            '-[rf:ReactionFrom]->(r:Reaction)-[:ReactionTo]->' +
            '(p) DETACH DELETE r',
          { userID, postID: parseInt(postID), reaction }
        )
        if (currentReaction.records[0].get('r').properties.type === reaction) {
          // Return early if reaction is the same, such as user clicking
          // 'like' a second time. This is to prevent recreation of reaction.
          return res.status(200).json({
            reactionSuccess: 'Reaction successfully removed'
          })
        }
      }

      const results = await queryNeo4j(
        req.app.locals.driver,
        'MATCH (u:User {userID: $userID}) ' +
          'MATCH (p:Post) WHERE id(p) = $postID ' +
          'CREATE (r:Reaction {type: $reaction }) ' +
          'CREATE (u)-[rf:ReactionFrom]->(r) ' +
          'CREATE (r)-[rt:ReactionTo]->(p)',
        { userID, postID: parseInt(postID), reaction }
      )

      return res.status(200).json({
        reactionSuccess: 'Reacted successfully'
      })
    } catch (err) {
      console.error(err)
      return res.status(500).json({
        reactionError: 'An unknown error occurred, please try again later'
      })
    }
  }
)

apiRoutes.post(
  '/posts/:postID/comment',
  [authMiddleware, csrfMiddleware],
  async (
    req: DefaultAPIRequest,
    res: express.Response
  ): Promise<express.Response> => {
    try {
      const { userID } = req // From auth middleware
      const { postID } = req.params
      const { comment } = req.body

      if (!comment) {
        return res.status(400).json({
          commentError: 'A comment must be provided'
        })
      }

      await queryNeo4j(
        req.app.locals.driver,

        'MATCH (u:User {userID: $userID}) ' +
          'MATCH (p:Post) WHERE id(p) = $postID ' +
          'CREATE (c:Comment {text: $comment, created_at: TIMESTAMP()}) ' +
          'CREATE (u)-[cf:CommentFrom]->(c) ' +
          'CREATE (c)-[ct:CommentTo]->(p)',
        { userID, postID: parseInt(postID), comment }
      )

      return res.status(200).json({
        commentSuccess: 'Commented successfully'
      })
    } catch (err) {
      console.error(err)
      return res.status(500).json({
        commentError: 'An unknown error occurred, please try again later'
      })
    }
  }
)

apiRoutes.post(
  '/posts/:postID/comment/:commentID/reply',
  [authMiddleware, csrfMiddleware],
  async (
    req: DefaultAPIRequest,
    res: express.Response
  ): Promise<express.Response> => {
    try {
      const { userID } = req // From auth middleware
      const { postID } = req.params
      const { commentID } = req.params
      const { comment } = req.body

      if (!comment) {
        return res.status(400).json({
          commentError: 'A comment must be provided'
        })
      }

      await queryNeo4j(
        req.app.locals.driver,

        'MATCH (u:User {userID: $userID}) ' +
          'MATCH (rootComment:Comment) WHERE id(rootComment) = $commentID ' +
          'CREATE (replyComment:Comment {text: $comment, created_at: TIMESTAMP()}) ' +
          'CREATE (u)-[cf:CommentFrom]->(replyComment) ' +
          'CREATE (replyComment)-[rt:CommentTo]->(rootComment)',
        {
          userID,
          postID: parseInt(postID),
          commentID: parseInt(commentID),
          comment
        }
      )

      return res.status(200).json({
        commentSuccess: 'Commented successfully'
      })
    } catch (err) {
      console.error(err)
      return res.status(500).json({
        commentError: 'An unknown error occurred, please try again later'
      })
    }
  }
)

apiRoutes.delete(
  '/comments/delete/:commentID',
  [authMiddleware, csrfMiddleware],
  async (
    req: DefaultAPIRequest,
    res: express.Response
  ): Promise<express.Response> => {
    try {
      const { userID } = req
      const { commentID } = req.params

      const results = await queryNeo4j(
        req.app.locals.driver,
        'MATCH (u:User {userID: $userID})-[:CommentFrom]->(c:Comment) ' +
          'WHERE id(c) = $commentID return c',
        { userID, commentID: parseInt(commentID) }
      )

      if (results.records.length === 0) {
        return res.status(404).json({
          deleteCommentError: 'Comment not found'
        })
      }

      await queryNeo4j(
        req.app.locals.driver,
        'MATCH (u:User {userID: $userID})-[:CommentFrom]->(c:Comment) ' +
          'WHERE id(c) = $commentID detach delete c',
        { userID, commentID: parseInt(commentID) }
      )

      return res.status(200).json({
        deleteCommentSuccess: 'Comment deleted successfully'
      })
    } catch (err) {
      console.error(err)
      return res.status(500).json({
        deleteCommentError: 'An unknown error occurred, please try again later'
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
      return res.status(500).json({
        getUserError: 'An unknown error occurred, please try again later'
      })
    }
  }
)

// Obtain supplied user's info and posts
apiRoutes.get(
  '/user/:userID/profile',
  optionalAuthMiddleware,
  async (
    req: DefaultAPIRequest,
    res: express.Response
  ): Promise<express.Response> => {
    try {
      const { userID = 'DNE' } = req
      const userIDParam = req.params.userID

      const results = await queryNeo4j(
        req.app.locals.driver,
        'MATCH (u:User {userID: $userIDParam}) ' +
          'OPTIONAL MATCH (p:Post)-[pb:POSTED_BY]->(u) ' +
          `${userID !== userIDParam ? 'WHERE p.published <> false ' : ''}` +
          'OPTIONAL MATCH (activeUser:User {userID: $userID}) ' +
          'OPTIONAL MATCH (activeUser)-[:ReactionFrom]->(r:Reaction)-[:ReactionTo]->(p) ' +
          'return p, u, r ORDER BY p.created_at DESC',
        { userIDParam, userID }
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
            const nodeReactionVal = r.get('r')
            const reaction = nodeReactionVal
              ? nodeReactionVal.properties.type
              : null
            // We'll keep user info in the post object for PostFeed
            return {
              userID: user.userID,
              username: user.username,
              bio: user.bio,
              avatar: user.avatar,
              postID: nodePostVal.identity.low,
              postCreatedAt: nodePostVal.properties.created_at.toNumber(),
              description: nodePostVal.properties.description,
              title: nodePostVal.properties.title,
              thumbnail: nodePostVal.properties.thumbnail,
              published: nodePostVal.properties.published,
              ...(reaction && { reaction })
            }
          })
      })
    } catch (err) {
      console.error(err)
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

apiRoutes.get(
  '/prerender',
  [authMiddleware],
  async (
    req: DefaultAPIRequest,
    res: express.Response
  ): Promise<express.Response> => {
    try {
      const { url } = req.query

      if (!url) {
        return res.status(400).json({
          prerenderError: 'A URL must be provided'
        })
      }

      const prerenderResponse = await axios.get(
        `${PRERENDER_SERVER}/render\?url\=${url}`
      )

      const root = parse(prerenderResponse.data)
      const titleElement = root.querySelector("meta[property='og:title']")
      const descriptionElement = root.querySelector("meta[property='og:description']")
      const imageElement = root.querySelector("meta[property='og:image']")

      const title = titleElement ? titleElement.getAttribute('content') : null
      const description = descriptionElement ? descriptionElement.getAttribute('content') : null
      const image = imageElement ? imageElement.getAttribute('content') : null

      if (!image) {
        return res.status(200).json({
          prerenderSuccess: 'Prerendered successfully',
          ...(title && { title }),
          ...(description && { description })
        })
      }

      const imageResponse = await axios.get(image, {responseType: 'arraybuffer'})

      const { ext } = imageType(
        imageResponse.data.slice(0, imageType.minimumBytes)
      )

      const staticImageURL = await uploadDirect(imageResponse.data, ext)

      return res.status(200).json({
        prerenderSuccess: 'Prerendered successfully',
        ...(title && { title }),
        ...(description && { description }),
        ...(staticImageURL && { image: staticImageURL })
      })
    } catch (err) {
      console.error(err)
      return res.status(500).json({
        prerenderError: 'An unknown error occurred, please try again later'
      })
    }
  }
)

export { apiRoutes }
