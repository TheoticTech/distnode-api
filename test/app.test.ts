// Third party
import chai from 'chai'
import chaiHttp from 'chai-http'
import jwt from 'jsonwebtoken'

// Local
import { app } from '../src/app'

// Configurations
import { JWT_ACCESS_TOKEN_SECRET } from '../src/config'

chai.use(chaiHttp)
chai.should()

describe('API routes', function () {
  describe('GET /api/user/id', function () {
    const validAccessToken = jwt.sign(
      { user_id: '123456789' },
      JWT_ACCESS_TOKEN_SECRET,
      {
        expiresIn: '10s'
      }
    )

    const expiredAccessToken = jwt.sign(
      { user_id: '123456789' },
      JWT_ACCESS_TOKEN_SECRET,
      {
        expiresIn: '-1s'
      }
    )

    it('should return 200 and userID if provided valid token', (done) => {
      chai
        .request(app)
        .get('/api/user/id')
        .set('Cookie', `accessToken=${validAccessToken}`)
        .send({})
        .end((err, res) => {
          if (err) {
            done(err)
          }
          res.should.have.status(200)
          res.body.should.have.property(
            'getUserIDSuccess',
            'User ID obtained successfully'
          )
          res.body.should.have.property('userID', '123456789')
          done()
        })
    })

    it('should return 401 if provided expired token', (done) => {
      chai
        .request(app)
        .get('/api/user/id')
        .set('Cookie', `accessToken=${expiredAccessToken}`)
        .send({})
        .end((err, res) => {
          if (err) {
            done(err)
          }
          res.should.have.status(401)
          res.body.should.have.property('authError', 'Expired access token')
          done()
        })
    })

    it('should return 401 if provided invalid token', (done) => {
      chai
        .request(app)
        .get('/api/user/id')
        .set('Cookie', 'accessToken=invalid-token')
        .send({})
        .end((err, res) => {
          if (err) {
            done(err)
          }
          res.should.have.status(401)
          res.body.should.have.property('authError', 'Invalid access token')
          done()
        })
    })

    it('should return 403 if token not provided', (done) => {
      chai
        .request(app)
        .get('/api/user/id')
        .send({})
        .end((err, res) => {
          if (err) {
            done(err)
          }
          res.should.have.status(403)
          res.body.should.have.property(
            'authError',
            'An access token is required for authentication'
          )
          done()
        })
    })
  })

  describe('GET /doesnt-exist', () => {
    it('should return 404 if route does not exist', (done) => {
      chai
        .request(app)
        .get('/doesnt-exist')
        .send({})
        .end((err, res) => {
          if (err) {
            done(err)
          }
          res.should.have.status(404)
          res.text.should.equal('Route not found')
          done()
        })
    })
  })
})
