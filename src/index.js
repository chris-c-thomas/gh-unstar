const { program } = require("commander");
const { getEnvConfig } = require("./config");
const { fetchAuthenticatedUser, fetchAllStarredRepos, unstarRepository } = require("./github");
const { createSpinner, sleep, formatNumber } = require("./ui");

let inquirerInstance;
async function getInquirer() {
  if (inquirerInstance) {
    return inquirerInstance;
  }

  const inquirerModule = await import("inquirer");
  inquirerInstance = inquirerModule.default || inquirerModule;
  return inquirerInstance;
}

let chalkInstance;
async function getChalk() {
  if (chalkInstance) {
    return chalkInstance;
  }

  const chalkModule = await import("chalk");
  chalkInstance = chalkModule.default || chalkModule;
  return chalkInstance;
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }

  return fallback;
}

function buildTestRepos(count) {
  return Array.from({ length: count }, (_, index) => {
    const repoNumber = String(index + 1).padStart(3, "0");
    return `test-owner/repo-${repoNumber}`;
  });
}

program
  .name("gh-unstar")
  .description("Remove all GitHub stars from your account")
  .option("-u, --username <username>", "GitHub username")
  .option("-t, --token <token>", "GitHub personal access token (classic)")
  .option("-y, --yes", "Skip confirmation safety prompt")
  .option("--dry-run", "Fetch and display count only")
  .option(
    "--delay <ms>",
    "Delay between unstar requests (milliseconds)",
    (value) => parsePositiveInt(value, 100),
    100,
  )
  .option(
    "--max-retries <n>",
    "Max retries for failed requests",
    (value) => parsePositiveInt(value, 5),
    5,
  )
  .option(
    "--per-page <n>",
    "Results per page (max 100)",
    (value) => parsePositiveInt(value, 100),
    100,
  )
  .option("--test", "Run in test mode (no GitHub API calls)")
  .option(
    "--test-count <n>",
    "Number of fake starred repos in test mode",
    (value) => parsePositiveInt(value, 25),
    25,
  )
  .option(
    "--test-fail-every <n>",
    "In test mode, every Nth unstar fails (0 disables)",
    (value) => parsePositiveInt(value, 0),
    0,
  );

async function resolveToken(options, env) {
  let token = options.token || env.token;

  if (!token) {
    const inquirer = await getInquirer();
    const answers = await inquirer.prompt([
      {
        type: "password",
        name: "token",
        message: "GitHub Personal Access Token (classic)",
        mask: "*",
        validate: (value) => (value && value.trim().length > 0 ? true : "Token is required."),
      },
    ]);

    token = answers.token;
  }

  return token;
}

async function resolveUsername(options, env, token) {
  let username = options.username || env.username;

  if (!username) {
    try {
      const user = await fetchAuthenticatedUser(token, {
        maxRetries: options.maxRetries,
      });
      if (user?.login) {
        username = user.login;
      }
    } catch (_error) {
      username = "";
    }
  }

  if (!username) {
    const inquirer = await getInquirer();
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "username",
        message: "GitHub username",
        validate: (value) => (value && value.trim().length > 0 ? true : "Username is required."),
      },
    ]);

    username = answers.username;
  }

  return username;
}

async function confirmDestructive(username) {
  const inquirer = await getInquirer();
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "confirmation",
      message: `!!! WARNING !!! This will unstar ALL repos for user ${username}. Type 'YES' to proceed:`,
      validate: (value) => (value.trim() === "YES" ? true : "Type 'YES' to continue."),
    },
  ]);

  return answers.confirmation.trim() === "YES";
}

async function run() {
  program.parse(process.argv);
  const options = program.opts();
  const env = getEnvConfig();
  const chalk = await getChalk();

  console.log(chalk.cyan("---------------------------------------------------------"));
  console.log(chalk.cyan("     GitHub Star Clean-up CLI                            "));
  console.log(chalk.cyan("---------------------------------------------------------"));

  const isTestMode = Boolean(options.test);
  let token = "";
  let username = "";

  if (isTestMode) {
    token = options.token || env.token || "test-token";
    username = options.username || env.username || "test-user";
    console.log(chalk.yellow("Test mode enabled. No GitHub API calls will be made."));
  } else {
    token = await resolveToken(options, env);
    username = await resolveUsername(options, env, token);
  }

  console.log(`\nPreparing to unstar repositories for ${chalk.bold(username)}.`);
  const fetchSpinner = (
    await createSpinner(
      isTestMode
        ? "Fetching starred repositories (test mode)..."
        : "Fetching starred repositories...",
    )
  ).start();
  let starredRepos = [];

  try {
    if (isTestMode) {
      starredRepos = buildTestRepos(options.testCount);
      fetchSpinner.succeed(
        `Fetched ${formatNumber(starredRepos.length)} repositories (test mode).`,
      );
    } else {
      starredRepos = await fetchAllStarredRepos({
        token,
        perPage: Math.min(options.perPage, 100),
        maxRetries: options.maxRetries,
        onProgress: (count, page) => {
          fetchSpinner.text = `Fetched ${formatNumber(count)} repositories (Page ${page})`;
        },
      });
      fetchSpinner.succeed(`Fetched ${formatNumber(starredRepos.length)} repositories.`);
    }
  } catch (error) {
    fetchSpinner.fail(`Failed to fetch starred repositories: ${error.message}`);
    return;
  }

  if (starredRepos.length === 0) {
    console.log(chalk.green("No starred repositories found. Clean slate achieved!"));
    return;
  }

  console.log(chalk.yellow(`Found ${formatNumber(starredRepos.length)} starred repositories.`));

  if (options.dryRun) {
    console.log(chalk.gray("Dry run enabled. No changes were made."));
    return;
  }

  if (!options.yes && !isTestMode) {
    const confirmed = await confirmDestructive(username);
    if (!confirmed) {
      console.log(chalk.gray("Unstar process cancelled by user."));
      return;
    }
  }
  console.log(chalk.cyan("\n--- Starting Unstarring Process ---"));

  const unstarSpinner = (await createSpinner("Unstarring repositories...")).start();

  let unstarredCount = 0;
  const failedRepos = [];

  for (let i = 0; i < starredRepos.length; i += 1) {
    const repo = starredRepos[i];
    unstarSpinner.text = `(${i + 1}/${starredRepos.length}) Unstarring ${repo}`;

    let success = false;

    if (isTestMode) {
      const failEvery = options.testFailEvery || 0;
      success = failEvery > 0 ? (i + 1) % failEvery !== 0 : true;
    } else {
      success = await unstarRepository(repo, {
        token,
        maxRetries: options.maxRetries,
      });
    }

    if (success) {
      unstarredCount += 1;
    } else {
      failedRepos.push(repo);
    }

    await sleep(options.delay);
  }

  unstarSpinner.succeed("Unstarring complete.");

  console.log(chalk.cyan("\n--- Process Complete ---"));
  console.log(`Total repositories processed: ${starredRepos.length}`);
  console.log(chalk.green(`Successfully unstarred: ${unstarredCount}`));

  if (failedRepos.length > 0) {
    console.log(chalk.red(`Failed to unstar: ${failedRepos.length}`));
  }
}

module.exports = run;

if (require.main === module) {
  run();
}
