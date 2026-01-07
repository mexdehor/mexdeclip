# Release Workflow Setup Summary

## What Was Set Up

✅ **GitHub Actions Workflow** (`.github/workflows/release.yml`)

- Automatically triggers on pushes to `main` or `master`
- Analyzes commits using semantic-release
- Creates releases and builds for Linux, Windows, and macOS

✅ **Semantic Release Configuration** (`.releaserc.json`)

- Configures automatic versioning based on commit messages
- Generates changelog automatically
- Updates version in `package.json`, `Cargo.toml`, and `tauri.conf.json`

✅ **Version Sync Script** (`scripts/sync-version.js`)

- Keeps versions synchronized across all files

✅ **Documentation**

- `RELEASES.md` - Complete release workflow guide
- `.github/COMMIT_GUIDE.md` - Quick reference for commit messages

## What You Need to Do

### 1. Install Dependencies

**For semantic-release (Node.js):**

```bash
npm install
```

This will install all semantic-release packages and dependencies.

**Note**: Your project uses Deno for building (via `deno task build`), but semantic-release requires Node.js/npm. The workflow handles both automatically.

### 2. Push to GitHub

```bash
git add .
git commit -m "chore: set up release workflow"
git push origin main
```

### 3. Verify GitHub Permissions

The workflow uses `GITHUB_TOKEN` which is automatically provided by GitHub Actions. Make sure:

- Your repository has Actions enabled
- The default `GITHUB_TOKEN` has write permissions (usually automatic)

To check/update permissions:

1. Go to repository Settings → Actions → General
2. Under "Workflow permissions", ensure "Read and write permissions" is selected
3. Check "Allow GitHub Actions to create and approve pull requests" if needed

### 4. Make Your First Release

After pushing, make a commit with a semantic commit message:

```bash
git commit -m "feat: add new feature"
git push origin main
```

This will trigger the workflow and create a release if the commit warrants one.

## How It Works

1. **You push commits** with semantic commit messages to `main`/`master`
2. **GitHub Actions triggers** the release workflow
3. **Semantic-release analyzes** commits since last release
4. **If release needed**:
   - Version is bumped automatically
   - Changelog is generated
   - Versions are synced across files
   - Git tag is created
   - GitHub release is created
   - Builds start for all platforms
5. **Artifacts are uploaded** to the GitHub release

## Important Notes

### Commit Messages Matter

Your commit messages determine releases:

- `feat:` → Minor version bump (0.1.0 → 0.2.0)
- `fix:` → Patch version bump (0.1.0 → 0.1.1)
- `BREAKING CHANGE:` → Major version bump (0.1.0 → 1.0.0)
- `docs:`, `chore:`, `refactor:` → No release

### First Release

The first time you push, semantic-release will:

- Start from version `0.1.0` (current version)
- Only create a release if you have `feat:` or `fix:` commits
- If you only have `chore:` commits (like setup), no release will be created

### Build Platforms

The workflow builds for:

- **Linux**: AppImage and DEB packages
- **macOS**: DMG installer (if you need to remove this, delete the `build-macos` job)

All artifacts are automatically attached to the GitHub release.

**Note**: The workflow uses:

- **Deno** for building (as configured in `tauri.conf.json` with `deno task build`)
- **Node.js** for semantic-release (since it's a Node.js tool)

### Version Synchronization

Versions are automatically kept in sync across:

- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`

## Troubleshooting

### No Release Created

- Check commit messages follow semantic format
- Verify commits are on `main`/`master` branch
- Check GitHub Actions logs for errors
- Ensure you have `feat:` or `fix:` commits (not just `chore:`)

### Build Failures

- Check GitHub Actions logs for specific errors
- Verify system dependencies are available (Linux builds need webkit2gtk)
- Ensure Rust toolchain is properly set up

### Version Not Synced

- The `sync-version.js` script runs automatically
- Check that all version files are committed
- Verify script has execute permissions (should be automatic)

## Next Steps

1. **Read `RELEASES.md`** for detailed documentation
2. **Read `.github/COMMIT_GUIDE.md`** for commit message examples
3. **Make a test commit** with `feat:` or `fix:` to trigger your first release
4. **Monitor GitHub Actions** to see the workflow in action

## Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Semantic Release Docs](https://semantic-release.gitbook.io/)
- [Tauri Action](https://github.com/tauri-apps/tauri-action)
