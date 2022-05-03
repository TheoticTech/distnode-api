// Third party
import aws from 'aws-sdk'
import crypto from 'crypto'

// Configurations
import {
  DO_SPACE_ENDPOINT,
  DO_SPACE_BUCKET,
  DO_SPACE_BUCKET_ACCESS_KEY,
  DO_SPACE_BUCKET_SECRET_KEY
} from '../config'

// Constants
const FILENAME_HASH_LENGTH = 64

const uploadDirect = async (data, ext) => {
  const s3 = new aws.S3({
    endpoint: new aws.Endpoint(DO_SPACE_ENDPOINT),
    accessKeyId: DO_SPACE_BUCKET_ACCESS_KEY,
    secretAccessKey: DO_SPACE_BUCKET_SECRET_KEY
  })

  const params = {
      Body: data,
      Bucket: DO_SPACE_BUCKET,
      Key: 'uploads/' +
        crypto.randomBytes(FILENAME_HASH_LENGTH).toString('hex') +
        ext,
      ACL: 'public-read'
  };

  await s3.putObject(params).promise()

  return `https://${DO_SPACE_BUCKET}.${DO_SPACE_ENDPOINT}/${params.Key}`
}

export default uploadDirect
