// jest.config.js
module.exports = {
    transform: {
      "^.+\\.jsx?$": "babel-jest",
    },
    // testTimeout: 30000,
    transformIgnorePatterns: [
      "/node_modules/(?!chai).+\\.js$"
    ],
    // other configurations...
  };
  