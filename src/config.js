const dotenv = require("dotenv");

dotenv.config();

function getEnvConfig() {
  return {
    username:
      process.env.GITHUB_USERNAME || process.env.GH_USERNAME || process.env.GITHUB_USER || "",
    token: process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_PAT || "",
  };
}

module.exports = {
  getEnvConfig,
};
