// Standard library
import fs from 'fs'

// Third party
import cookieParser from 'cookie-parser'
import express from 'express'
import mongoose from 'mongoose'

// Local
import { apiRoutes } from './routes/api'

// Configurations
import { ENVIRONMENT, MONGO_CA_CERT, MONGO_URI, PORT } from './config'

// Constants
const MONGO_CA_CERT_FILENAME = 'mongo-ca-cert.pem'

console.log(`App starting in ${ENVIRONMENT} mode`)

const app = express()
app.use(cookieParser())
app.use(express.json())

if (ENVIRONMENT === 'production') {
    if (!MONGO_CA_CERT) {
        console.error('MONGO_CA_CERT must be set if NODE_ENV === production')
        process.exit(1)
    }
    fs.writeFileSync(MONGO_CA_CERT_FILENAME, MONGO_CA_CERT)
}

mongoose
    .connect(MONGO_URI, {
        // MONGO_CA_CERT can be undefined when NODE_ENV !== production
        tlsCAFile:
            ENVIRONMENT === 'production' ? MONGO_CA_CERT_FILENAME : undefined
    })
    .then(() => {
        console.log('Successfully connected to database')
    })
    .catch((error) => {
        console.log('Database connection failed. Exiting now...')
        console.error(error)
        process.exit(1)
    })

app.use('/api', apiRoutes)

app.get('/health', (req, res): express.Response => {
    try {
        return res.status(200).send('OK')
    } catch (err) {
        return res.status(500).send('An error occurred')
    }
})

app.use('*', (req, res) => {
    return res.status(404).send('Route not found')
})

app.listen(PORT, () => {
    console.log('Server running at port:', PORT)
})
