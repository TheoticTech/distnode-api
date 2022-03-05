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
  describe('GET /api/whoami', function () {
    const accessToken = jwt.sign(
      { user_id: 'johndoe' },
      JWT_ACCESS_TOKEN_SECRET,
      {
        expiresIn: '10s'
      }
    )

    it('should return 200 and userID if provided valid token', (done) => {
      chai
        .request(app)
        .get('/api/whoami')
        .set('Cookie', `accessToken=${accessToken}`)
        .send({})
        .end((err, res) => {
          if (err) {
            done(err)
          }
          res.should.have.status(200)
          res.text.should.equal('johndoe')
          done()
        })
    })

    it('should return 401 if provided invalid token', (done) => {
      chai
        .request(app)
        .get('/api/whoami')
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
        .get('/api/whoami')
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
