module.exports = async () => {
  const container = globalThis.__TESTCONTAINER_POSTGRES__;
  if (container) {
    await container.stop();
  }
};
