# @hookform/resolvers Zod v4.x Compatibility Research

## Summary

Your TypeScript error is a known compatibility issue between `@hookform/resolvers` v5.2.1 and Zod v4.1.4. The good news is that this has been resolved in the latest version.

**Recommendation:** Upgrade `@hookform/resolvers` to **v5.2.2** (latest stable as of September 2025).

## The Error You're Experiencing

The error message you're seeing:
```
The types of '_zod.version.minor' are incompatible. Type '1' is not assignable to type '0'.
```

This error indicates that `@hookform/resolvers` v5.2.1 was compiled with type definitions expecting Zod v4.0.x (minor version = 0), but you're using Zod v4.1.4 (minor version = 1).

**Source:** This is documented in GitHub issue #813 on the react-hook-form/resolvers repository: https://github.com/react-hook-form/resolvers/issues/813

## Version History & Zod 4 Support

### Key Releases

| Version | Release Date | Zod 4 Support | Key Changes |
|---------|--------------|---------------|-------------|
| v5.0.0 | Apr 1, 2025 | No | Breaking: Requires react-hook-form@7.55.0+, type inference changes |
| v5.0.1 | Apr 2, 2025 | No | Bug fix for react-hook-form version constraint |
| v5.1.0 | Jun 7, 2025 | **Yes** | Initial Zod 4 support added; also supports Zod v4 mini |
| v5.1.1 | Jun 9, 2025 | Yes | Fixed zod peer dependency issue |
| v5.2.0 | Jul 25, 2025 | Yes | Added ajv-formats feature |
| v5.2.1 | Jul 29, 2025 | Partial* | Multiple Zod 4 fixes (#801, #798) - **Has regression issue** |
| **v5.2.2** | **Sep 14, 2025** | **Yes** | **Fixed output type for Zod 4 resolver (#803)** |

*v5.2.1 has a known regression where it fails with Zod v4.1.x (minor version > 0)

## What Changed

### v5.1.0 - Initial Zod 4 Support
https://github.com/react-hook-form/resolvers/releases/tag/v5.1.0

Feature: "support Zod 4, Zod v4 mini, and retains compatibility with Zod v3"

This was the first official release supporting Zod v4.

### v5.2.1 - Multiple Fixes (Regression Introduced)
https://github.com/react-hook-form/resolvers/releases/tag/v5.2.1

Bug Fixes:
- discriminated union for zod v4 mini (#784)
- zod v4 peer deps (#798)
- **zod:** fix output type for Zod 4 resolver (#801)

However, some changes introduced a regression affecting Zod v4.1.x users.

### v5.2.2 - Final Fix (Latest Stable)
https://github.com/react-hook-form/resolvers/releases/tag/v5.2.2

Release: September 14, 2025

Bug Fix:
- **zod:** fix output type for Zod 4 resolver (#803)

This release resolves the regression and provides full Zod v4.x support including minor versions beyond v4.0.

## Community Solutions & Workarounds

From the GitHub issue discussion, users have reported the following:

### Quick Fixes That Worked

1. **Upgrade to v5.2.2** (Recommended)
   - Clean install required: Remove `node_modules` and lock files
   - Reinstall dependencies

2. **Downgrade to v5.2.0** (Temporary workaround)
   - Works but you miss bug fixes from v5.2.1
   - Also requires clean install

3. **Lock Zod to v4.0.x**
   - One user reported that fixing zod to `~4.0.17` eliminated the type error
   - This is a workaround that suggests the issue is specific to Zod minor version detection
   - Not recommended as it blocks Zod v4.1+ features

### What Didn't Work
- Simply upgrading @hookform/resolvers without cleaning `node_modules` and lock files
- Upgrading @hookform/resolvers to v5.2.1 (still had the issue)

## Recommended Upgrade Path

### For Your Project

**Current state:**
```json
{
  "dependencies": {
    "zod": "4.1.4",
    "@hookform/resolvers": "5.2.1"
  }
}
```

**Target state:**
```json
{
  "dependencies": {
    "zod": "4.1.4",
    "@hookform/resolvers": "5.2.2"
  }
}
```

### Steps to Update

1. Update `package.json`:
   ```bash
   npm install @hookform/resolvers@5.2.2
   # or
   yarn upgrade @hookform/resolvers@5.2.2
   # or
   pnpm update @hookform/resolvers@5.2.2
   ```

2. **Clean install (important):**
   ```bash
   # Remove dependencies
   rm -rf node_modules
   rm package-lock.json  # or yarn.lock / pnpm-lock.yaml

   # Reinstall
   npm install
   ```

3. Verify TypeScript compilation:
   ```bash
   npx tsc --noEmit
   ```

## Breaking Changes to Be Aware Of

### v5.0.0 Migration (Already in your codebase)
If you're on v5.2.1, you've already handled this, but for reference:

**Before v5.0.0:**
```typescript
const methods = useForm<FormValues>();
```

**After v5.0.0 (Current, Required):**
```typescript
const methods = useForm<z.input<typeof schema>, any, z.output<typeof schema>>();
// OR let types be inferred automatically (recommended)
const methods = useForm({
  resolver: zodResolver(schema)
});
```

The recommended approach is to let TypeScript infer types from your schema rather than manually specifying them.

## Important Notes

### Zod Version Import
The official documentation notes that you can use either:
```typescript
import { z } from 'zod';
// or
import { z } from 'zod/v4';
```

Both work with v5.2.2+.

### Package.json Peer Dependency
Your package.json should ideally have:
```json
{
  "peerDependencies": {
    "zod": "^3 || ^4"
  }
}
```

This allows flexibility for both Zod v3 and v4 users.

## References

- **NPM Package:** https://www.npmjs.com/package/@hookform/resolvers
- **GitHub Releases:** https://github.com/react-hook-form/resolvers/releases
- **Known Issue #813:** https://github.com/react-hook-form/resolvers/issues/813 (Detailed discussion of v5.2.1 regression)
- **NPM Latest Version:** v5.2.2 (published September 14, 2025)

## Action Items

1. Update `@hookform/resolvers` to v5.2.2
2. Clean install dependencies (remove node_modules and lock files)
3. Test TypeScript compilation
4. Update any package.json to reflect the new version

This should completely resolve your TypeScript error related to the Zod version mismatch.
