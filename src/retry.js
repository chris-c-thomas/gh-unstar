const DEFAULT_MAX_RETRIES = 5;

async function fetchWithRetry(apiCall, { maxRetries = DEFAULT_MAX_RETRIES } = {}) {
  let retries = 0;

  while (true) {
    try {
      const response = await apiCall();

      if (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0") {
        const resetTime = Number.parseInt(response.headers.get("x-ratelimit-reset"), 10) * 1000;
        const delay = resetTime - Date.now();
        const waitMs = delay > 0 ? delay : 1000;
        console.warn("\n\n!!! GitHub Rate Limit Hit !!!");
        console.log(
          `Waiting ${Math.ceil(waitMs / 1000)} seconds until reset (${new Date(
            resetTime,
          ).toLocaleTimeString()}).`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      if (response.status >= 400 && response.status !== 204) {
        const errorBody = await response.json().catch(() => ({
          message: "No content",
        }));
        throw new Error(
          `API returned status ${response.status}: ${errorBody.message || "Unknown error"}`,
        );
      }

      return response;
    } catch (error) {
      if (retries < maxRetries) {
        const delay = 2 ** retries * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        retries += 1;
        continue;
      }

      throw new Error(`Failed after ${maxRetries} attempts. Last error: ${error.message}`);
    }
  }
}

module.exports = {
  fetchWithRetry,
};
