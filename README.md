# GitHub Unstar CLI

![GitHub package.json version](https://img.shields.io/github/package-json/v/chris-c-thomas/gh-unstar?style=for-the-badge)
![GitHub License](https://img.shields.io/github/license/chris-c-thomas/gh-unstar?style=for-the-badge)

CLI to remove all starred repositories from a GitHub account

## Features

- Unstars all repositories for the authenticated user
- Confirmation safety check
- Dry-run support
- Test mode
- Additional configurable options (see below)

## Requirements

- Node.js 18+
- A GitHub Personal Access Token (classic)

## Usage

npx:

```bash
npx gh-unstar
```

or install globally:

```bash
npm install -g gh-unstar
```

## Usage

```bash
gh-unstar
```

## Options

- `-u, --username <username>`: GitHub username to target.
- `-t, --token <token>`: GitHub personal access token to authenticate API calls.
- `-y, --yes`: Skip the confirmation prompt.
- `--dry-run`: Fetch starred repositories and report the count without changing anything.
- `--delay <ms>`: Delay in milliseconds between unstar requests (default 100).
- `--max-retries <n>`: Maximum retries for failed API requests with exponential backoff (default 5).
- `--per-page <n>`: Results per page when fetching starred repos (max 100, default 100).
- `--test`: Run without API calls or credentials.
- `--test-count <n>`: Number of fake starred repositories in test mode (default 25).
- `--test-fail-every <n>`: Every Nth unstar fails in test mode (0 disables).

## Auth

Create a Personal Access Token (classic) with at least `public_repo` scope
(or `repo` to include private stars).

Environment variables:

- `GITHUB_TOKEN`
- `GITHUB_USERNAME` (optional, auto-detected if missing)

Example `.env`:

```
GITHUB_TOKEN=your_token_here
GITHUB_USERNAME=your_username
```

## Safety

This tool will unstar all repositories for the account. It **requires** typing
`YES` unless `--yes` is provided.

## Dev

Install dependencies:

```bash
npm install
```

Available scripts:

- `npm run start`: run the CLI entrypoint locally
- `npm run lint`: run Biome lint checks
- `npm run format`: format files in-place using Biome
- `npm run check`: run Biome formatting and safe lint fixes in one pass

## License

MIT
