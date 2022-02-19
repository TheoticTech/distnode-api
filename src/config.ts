const ENVIRONMENT = process.env.NODE_ENV || 'development'
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3002'
const JWT_ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_TOKEN_SECRET
const MONGO_CA_CERT = process.env.MONGO_CA_CERT
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test'
const PORT = process.env.PORT || 3001

export { ENVIRONMENT, FRONTEND_ORIGIN, JWT_ACCESS_TOKEN_SECRET, MONGO_CA_CERT, MONGO_URI, PORT }
