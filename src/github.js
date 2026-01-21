const { fetchWithRetry } = require("./retry");

const GITHUB_API_URL = "https://api.github.com";

function buildHeaders(token) {
  return {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github.v3+json",
  };
}

async function fetchAuthenticatedUser(token, { maxRetries } = {}) {
  const response = await fetchWithRetry(
    () =>
      fetch(`${GITHUB_API_URL}/user`, {
        headers: buildHeaders(token),
      }),
    { maxRetries },
  );

  return response.json();
}

async function fetchAllStarredRepos({ token, perPage = 100, maxRetries, onProgress } = {}) {
  const allRepos = [];
  let page = 1;

  while (true) {
    const url = `${GITHUB_API_URL}/user/starred?per_page=${perPage}&page=${page}`;

    const response = await fetchWithRetry(
      () =>
        fetch(url, {
          headers: buildHeaders(token),
        }),
      { maxRetries },
    );

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      break;
    }

    const fullNames = data.map((repo) => repo.full_name).filter(Boolean);
    allRepos.push(...fullNames);

    if (typeof onProgress === "function") {
      onProgress(allRepos.length, page);
    }

    page += 1;
  }

  return allRepos;
}

async function unstarRepository(fullRepoName, { token, maxRetries } = {}) {
  const url = `${GITHUB_API_URL}/user/starred/${fullRepoName}`;

  try {
    const response = await fetchWithRetry(
      () =>
        fetch(url, {
          method: "DELETE",
          headers: buildHeaders(token),
        }),
      { maxRetries },
    );

    return response.status === 204;
  } catch (_error) {
    return false;
  }
}

module.exports = {
  fetchAuthenticatedUser,
  fetchAllStarredRepos,
  unstarRepository,
};
