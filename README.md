# Getting Started

## Prerequisites
This application also requires a Neo4j database, configured by setting
`NEO4J_URI`, `NEO4J_USERNAME` and `NEO4J_PASSWORD` environment variables.
```sh
export NEO4J_USERNAME='your-neo4j-username'
export NEO4J_PASSWORD='your-neo4j-password'
export NE4J_URI='neo4j+s://your-neo4j-uri.io:7687'
```

Additionally, this application requires a JWT secret key, configured by
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
