# Release Workflow Guide

This project uses **semantic-release** with **GitHub Actions** to automate versioning, changelog generation, and releases based on your commit messages.

## How It Works

### Semantic Commits

The release workflow analyzes your commit messages to determine the type of release. Use the [Conventional Commits](https://www.conventionalcommits.org/) specification:

#### Commit Types

- `feat:` - A new feature (triggers a **minor** version bump: 0.1.0 → 0.2.0)
- `fix:` - A bug fix (triggers a **patch** version bump: 0.1.0 → 0.1.1)
- `perf:` - Performance improvement (triggers a **patch** version bump)
- `refactor:` - Code refactoring (does NOT trigger a release)
- `docs:` - Documentation changes (does NOT trigger a release)
- `style:` - Code style changes (does NOT trigger a release)
- `test:` - Test changes (does NOT trigger a release)
- `chore:` - Maintenance tasks (does NOT trigger a release)
- `BREAKING CHANGE:` - Breaking changes (triggers a **major** version bump: 0.1.0 → 1.0.0)

#### Commit Message Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

#### Examples

```bash
# Minor release (new feature)
git commit -m "feat: add clipboard history search"

# Patch release (bug fix)
git commit -m "fix: resolve Wayland clipboard access issue"

# Major release (breaking change)
git commit -m "feat: redesign clipboard API

BREAKING CHANGE: clipboard API now requires authentication"

# No release (documentation)
git commit -m "docs: update README with installation instructions"

# No release (refactoring)
git commit -m "refactor: improve clipboard manager structure"
```

### Release Process

1. **Push to main/master branch** - The workflow triggers automatically
2. **Semantic-release analyzes commits** - Checks for commits since the last release
3. **Version bump** - If changes warrant a release, version is bumped automatically
4. **Changelog generation** - Creates/updates `CHANGELOG.md` with release notes
5. **Version sync** - Updates versions in:
   - `package.json`
   - `src-tauri/Cargo.toml`
   - `src-tauri/tauri.conf.json`
6. **Git tag** - Creates a git tag (e.g., `v1.2.3`)
7. **GitHub release** - Creates a GitHub release with the tag
8. **Build artifacts** - Builds Tauri apps for Linux, Windows, and macOS
9. **Upload artifacts** - Attaches built binaries to the GitHub release

### What Gets Released

The workflow builds and releases:

- **Linux**: AppImage and DEB packages
- **macOS**: DMG installer

All artifacts are automatically attached to the GitHub release.

## Workflow Details

### GitHub Actions Workflow

The workflow (`.github/workflows/release.yml`) consists of:

1. **create-release job**: Runs semantic-release to determine if a release is needed
2. **build-linux job**: Builds Linux binaries (runs if release is created)
3. **build-windows job**: Builds Windows binaries (runs if release is created)
4. **build-macos job**: Builds macOS binaries (runs if release is created)

### Configuration Files

- **`.releaserc.json`**: Semantic-release configuration
- **`scripts/sync-version.js`**: Script to sync versions across files

## Manual Release Process

If you need to create a release manually:

1. **Make your changes** and commit them with semantic commit messages
2. **Push to main/master**:
   ```bash
   git push origin main
   ```
3. **Monitor the workflow** - Check GitHub Actions tab for progress
4. **Verify the release** - Once complete, check the Releases page

## Skipping a Release

If you want to make commits without triggering a release, use non-release commit types:

```bash
# These won't trigger a release:
git commit -m "docs: update documentation"
git commit -m "chore: update dependencies"
git commit -m "refactor: improve code structure"
git commit -m "test: add unit tests"
```

## Breaking Changes

To trigger a major version bump, include `BREAKING CHANGE:` in your commit:

```bash
git commit -m "feat: redesign API

BREAKING CHANGE: The clipboard API now requires authentication tokens"
```

Or use the `!` syntax:

```bash
git commit -m "feat!: redesign API"
```

## Troubleshooting

### Release Not Created

- Check that your commit messages follow the semantic commit format
- Verify commits are on the `main` or `master` branch
- Check GitHub Actions logs for errors
- Ensure `GITHUB_TOKEN` has proper permissions (usually automatic)

### Version Not Synced

- The `sync-version.js` script should run automatically
- Check that all version files are included in the git assets list
- Verify the script has execute permissions: `chmod +x scripts/sync-version.js`

### Build Failures

- Check that all system dependencies are installed (see workflow file)
- Verify Rust toolchain is properly set up
- Check Tauri configuration is correct

## Best Practices

1. **Use semantic commits consistently** - This ensures accurate versioning
2. **Write clear commit messages** - They become your changelog
3. **Group related changes** - Multiple fixes can be in one commit
4. **Test before pushing** - Build failures delay releases
5. **Review changelog** - The generated changelog helps users understand changes

## Version Numbering

The project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features, backward compatible
- **PATCH** (0.0.1): Bug fixes, backward compatible

Starting version: `0.1.0` (initial development)

## Additional Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Semantic Release Documentation](https://semantic-release.gitbook.io/)
- [Tauri Action Documentation](https://github.com/tauri-apps/tauri-action)

