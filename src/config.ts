const ENVIRONMENT = process.env.NODE_ENV || 'development'
const CSRF_TOKEN_SECRET = process.env.CSRF_TOKEN_SECRET
const DO_SPACE_ENDPOINT =
  process.env.DO_SPACE_ENDPOINT || 'sfo3.digitaloceanspaces.com'
const DO_SPACE_BUCKET = process.env.DO_SPACE_BUCKET || 'distnode-static-dev'
const DO_SPACE_BUCKET_ACCESS_KEY = process.env.DO_SPACE_BUCKET_ACCESS_KEY
const DO_SPACE_BUCKET_SECRET_KEY = process.env.DO_SPACE_BUCKET_SECRET_KEY
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3002'
const FRONTEND_ORIGIN_WWW =
process.env.FRONTEND_ORIGIN_WWW || 'http://www.localhost:3002'
const PRERENDER_SERVER = process.env.PRERENDER_SERVER || 'http://localhost:3003'
const JWT_ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_TOKEN_SECRET
const MONGO_CA_CERT = process.env.MONGO_CA_CERT
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test'
const NEO4J_USERNAME = process.env.NEO4J_USERNAME
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD
const NEO4J_URI = process.env.NEO4J_URI
const PORT = process.env.PORT || 3001

export {
  ENVIRONMENT,
  CSRF_TOKEN_SECRET,
  DO_SPACE_ENDPOINT,
  DO_SPACE_BUCKET,
  DO_SPACE_BUCKET_ACCESS_KEY,
  DO_SPACE_BUCKET_SECRET_KEY,
  FRONTEND_ORIGIN,
  FRONTEND_ORIGIN_WWW,
  PRERENDER_SERVER,
  JWT_ACCESS_TOKEN_SECRET,
  MONGO_CA_CERT,
  MONGO_URI,
  NEO4J_USERNAME,
  NEO4J_PASSWORD,
  NEO4J_URI,
  PORT
}
