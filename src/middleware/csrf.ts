// Third party
import express from 'express'
import jwt from 'jsonwebtoken'

// Configurations
import { CSRF_TOKEN_SECRET } from '../config'

if (!CSRF_TOKEN_SECRET) {
  console.error('CSRF_TOKEN_SECRET must be set')
  process.exit(1)
}

const csrfMiddleware = (req, res, next): express.Response => {
  const csrfTokenCookie = req.cookies?.csrfToken
  const { csrfToken: csrfTokenBody } = req.body

  if (!csrfTokenCookie || !csrfTokenBody) {
    return res
      .status(401)
      .json({ csrfError: 'CSRF cookie and body token required' })
  }

  if (csrfTokenCookie !== csrfTokenBody) {
    return res.status(401).json({ csrfError: 'CSRF token mismatch' })
  }

  try {
    jwt.verify(csrfTokenCookie, CSRF_TOKEN_SECRET)
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      // Don't change the error message, it is used by the frontend
      return res.status(401).json({ csrfError: 'Expired CSRF token' })
    } else {
      return res.status(401).json({ csrfError: 'Invalid CSRF token' })
    }
  }
  return next()
}

export { csrfMiddleware }
