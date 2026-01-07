# Quick Commit Guide

## Semantic Commit Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

## Commit Types

| Type              | Description             | Version Bump              |
| ----------------- | ----------------------- | ------------------------- |
| `feat`            | New feature             | **Minor** (0.1.0 → 0.2.0) |
| `fix`             | Bug fix                 | **Patch** (0.1.0 → 0.1.1) |
| `perf`            | Performance improvement | **Patch**                 |
| `refactor`        | Code refactoring        | ❌ No release             |
| `docs`            | Documentation changes   | ❌ No release             |
| `style`           | Code style changes      | ❌ No release             |
| `test`            | Test changes            | ❌ No release             |
| `chore`           | Maintenance tasks       | ❌ No release             |
| `BREAKING CHANGE` | Breaking changes        | **Major** (0.1.0 → 1.0.0) |

## Examples

### ✅ Will trigger release:

```bash
git commit -m "feat: add dark mode support"
git commit -m "fix: resolve clipboard memory leak"
git commit -m "perf: optimize clipboard polling interval"
git commit -m "feat!: redesign API

BREAKING CHANGE: API now requires authentication"
```

### ❌ Won't trigger release:

```bash
git commit -m "docs: update README"
git commit -m "chore: update dependencies"
git commit -m "refactor: improve code structure"
git commit -m "test: add unit tests"
```

## Breaking Changes

To trigger a major version bump, include `BREAKING CHANGE:` in the commit body:

```bash
git commit -m "feat: redesign API

BREAKING CHANGE: The API now requires authentication tokens"
```

Or use the `!` syntax:

```bash
git commit -m "feat!: redesign API"
```

## Tips

- **One feature/fix per commit** - Makes releases cleaner
- **Write clear messages** - They become your changelog
- **Use present tense** - "add feature" not "added feature"
- **Be descriptive** - "fix clipboard crash" not "fix bug"
