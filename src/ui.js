let oraInstance;

async function getOra() {
  if (oraInstance) {
    return oraInstance;
  }

  const oraModule = await import("ora");
  oraInstance = oraModule.default || oraModule;
  return oraInstance;
}

function sleep(ms) {
  if (!Number.isFinite(ms) || ms <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

async function createSpinner(text) {
  const ora = await getOra();
  return ora({ text, color: "cyan" });
}

module.exports = {
  createSpinner,
  sleep,
  formatNumber,
};
