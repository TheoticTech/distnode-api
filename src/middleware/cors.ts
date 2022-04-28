// Third party
import express from 'express'

// Configurations
import { FRONTEND_ORIGIN, FRONTEND_ORIGIN_WWW } from '../config'

const allowedOrigins = [FRONTEND_ORIGIN, FRONTEND_ORIGIN_WWW]

const corsMiddleware = (req, res, next): express.Response => {
  const origin = req.headers.origin
  res.header(
    'Access-Control-Allow-Origin',
    allowedOrigins.includes(origin) ? origin : allowedOrigins[0]
  )
  res.header('Access-Control-Allow-Credentials', true)
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  return next()
}

export { corsMiddleware }
