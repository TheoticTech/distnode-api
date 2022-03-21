// Standard library
import path from 'path'

// Third party
import aws from 'aws-sdk'
import crypto from 'crypto'
import multer from 'multer'
import multerS3 from 'multer-s3'

// Configurations
import {
  DO_SPACE_ENDPOINT,
  DO_SPACE_BUCKET,
  DO_SPACE_BUCKET_ACCESS_KEY,
  DO_SPACE_BUCKET_SECRET_KEY
} from '../config'

// Constants
const FILENAME_HASH_LENGTH = 64
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024 * 1024 // 2GB

// Ensure necessary configurations are set
if (
  [
    DO_SPACE_ENDPOINT,
    DO_SPACE_BUCKET,
    DO_SPACE_BUCKET_ACCESS_KEY,
    DO_SPACE_BUCKET_SECRET_KEY
  ].some((e) => !e)
) {
  console.error(
    'DO_SPACE_ENDPOINT, ' +
      'DO_SPACE_BUCKET, ' +
      'DO_SPACE_BUCKET_ACCESS_KEY ' +
      'and DO_SPACE_BUCKET_SECRET_KEY must be set'
  )
  process.exit(1)
}

const s3 = new aws.S3({
  endpoint: new aws.Endpoint(DO_SPACE_ENDPOINT),
  accessKeyId: DO_SPACE_BUCKET_ACCESS_KEY,
  secretAccessKey: DO_SPACE_BUCKET_SECRET_KEY
})

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: DO_SPACE_BUCKET,
    acl: 'public-read',
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname })
    },
    key: function (req, file, cb) {
      cb(
        null,
        'uploads/' +
          crypto.randomBytes(FILENAME_HASH_LENGTH).toString('hex') +
          path.extname(file.originalname)
      )
    }
  }),
  limits: {
    fileSize: MAX_FILE_SIZE
  }
})

const uploadMiddleware = upload.single('media')

export { uploadMiddleware }
