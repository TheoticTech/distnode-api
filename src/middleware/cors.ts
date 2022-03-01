// Third party
import express from 'express'

// Configurations
import { FRONTEND_ORIGIN } from '../config'

const corsMiddleware = (req, res, next): express.Response => {
  res.header('Access-Control-Allow-Origin', FRONTEND_ORIGIN)
  res.header('Access-Control-Allow-Credentials', true)
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Set-Cookie')
  res.header('Vary', 'Origin')
  return next()
}

export { corsMiddleware }
