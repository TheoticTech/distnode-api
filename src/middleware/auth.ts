// Third party
import express from 'express'
import jwt from 'jsonwebtoken'

// Configurations
import { JWT_ACCESS_TOKEN_SECRET } from '../config'

if (!JWT_ACCESS_TOKEN_SECRET) {
  console.error('JWT_ACCESS_TOKEN_SECRET must be set')
  process.exit(1)
}

const authMiddleware = (req, res, next): express.Response => {
  const accessToken = req.cookies?.accessToken

  if (!accessToken) {
    return res
      .status(403)
      .json({ authError: 'An access token is required for authentication' })
  }
  try {
    const decoded = jwt.verify(accessToken, JWT_ACCESS_TOKEN_SECRET)
    req.userID = decoded.user_id
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      // Don't change the error message, it is used by the frontend
      return res.status(401).json({ authError: 'Expired access token' })
    } else {
      console.log(err)
      return res.status(401).json({ authError: 'Invalid access token' })
    }
  }
  return next()
}

export { authMiddleware }
