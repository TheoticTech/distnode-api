# Getting Started

## Prerequisites
This application requires a MongoDB database, configured by setting a
`MONGO_URI` environment variable. By default, the [config file](./src/config.ts)
sets the MongoDB URI to `mongodb://localhost:27017/test`.

Additionally, this application requires a JWT secret keys, configured by
setting a `JWT_ACCESS_TOKEN_SECRET` environment variable. For development
and testing, the following can be used:
```sh
export JWT_ACCESS_TOKEN_SECRET='super-secret-key-1'
```

## Installation
```sh
npm i
```

## Running in Production
```sh
npm start
```

## Running in Development
```sh
npm run dev
```

## Running Tests
```sh
npm test
```

## Running Test Coverage
```sh
npm run coverage
```

## [Helpful Examples](./rest/api.rest)
