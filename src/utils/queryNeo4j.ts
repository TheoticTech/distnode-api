const queryNeo4j = async (driver, query, params) => {
  const session = driver.session()

  try {
    return await session.run(query, params)
  } finally {
    await session.close()
  }
}

export default queryNeo4j
