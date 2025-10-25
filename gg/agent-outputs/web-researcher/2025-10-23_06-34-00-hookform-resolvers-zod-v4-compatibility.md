# @hookform/resolvers Compatibility with Zod v4

**Research Date:** October 23, 2025
**Query:** Finding the correct version of @hookform/resolvers compatible with Zod v4.1.12

## Summary

**Critical Finding:** @hookform/resolvers version 5.2.2 has a **minor version incompatibility** with Zod 4.1.x. The library expects Zod 4.0.x (minor version 0) but Zod 4.1.12 has minor version 1, causing TypeScript errors.

**Recommended Solutions (in order of preference):**
1. **Downgrade to @hookform/resolvers 5.2.0** and reinstall dependencies
2. **Use standardSchemaResolver** instead of zodResolver (works with current versions)
3. **Wait for @hookform/resolvers to release a fix** for Zod 4.1.x compatibility

## The Problem

### Your Error
```typescript
Type '1' is not assignable to type '0' in _zod.version.minor
```

This error occurs because:
- Zod 4.1.12 has `version.minor = 1`
- @hookform/resolvers 5.2.2 expects `version.minor = 0` (Zod 4.0.x)

### Root Cause
The type definitions in @hookform/resolvers 5.2.2 include a strict version check that validates the exact minor version of Zod v4, and it was built against Zod 4.0.x. When you use Zod 4.1.x, this type check fails.

---

## Detailed Findings

### Version Timeline

#### v5.1.0 (June 7, 2025) - Initial Zod v4 Support
**Source:** [GitHub Releases](https://github.com/react-hook-form/resolvers/releases/tag/v5.1.0)

**Features:**
- Support for Zod 4, Zod v4 mini, and retains compatibility with Zod v3
- Pull request #777

**Important Notes:**
- Requires **minimum Zod 3.25.0** (which added the `zod/v4/core` export)
- If using Zod v3, you must use v3.25.0 or higher

#### v5.2.0 (July 25, 2025)
**Source:** [GitHub Releases](https://github.com/react-hook-form/resolvers/releases/tag/v5.2.0)

**Features:**
- Added ajv-formats for ajvResolver
- No Zod-specific changes

**Status:** ✅ Works with Zod 4.1.12 (confirmed by multiple users in issue #813)

#### v5.2.1 (July 29, 2025)
**Source:** [GitHub Releases](https://github.com/react-hook-form/resolvers/releases/tag/v5.2.1)

**Bug Fixes:**
- Discriminated union for zod v4 mini (#784)
- Zod v4 peer deps (#798)
- Fix output type for Zod 4 resolver (#801)

**Status:** ⚠️ Mixed reports - some users still experienced issues

#### v5.2.2 (September 14, 2025) - Current Latest
**Source:** [GitHub Releases](https://github.com/react-hook-form/resolvers/releases/tag/v5.2.2)

**Bug Fixes:**
- Fix output type for Zod 4 resolver (#803)

**Status:** ❌ **Known issue with Zod 4.1.x** - causes the type error you're experiencing

---

## Community-Verified Solutions

### Solution 1: Downgrade to @hookform/resolvers 5.2.0 (RECOMMENDED)

**Source:** [Issue #813](https://github.com/react-hook-form/resolvers/issues/813)

Multiple users confirmed this works:

```json
{
  "dependencies": {
    "@hookform/resolvers": "5.2.0",  // NO CARET (^)
    "react-hook-form": "^7.62.0",
    "zod": "^4.1.12"
  }
}
```

**Steps:**
1. Update package.json to use **exactly** `5.2.0` (no `^` prefix)
2. Delete `node_modules` directory
3. Delete your lock file (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, or `bun.lockb`)
4. Run install command (`npm install`, `yarn install`, `pnpm install`, or `bun install`)

**Why this works:** Version 5.2.0 doesn't have the strict minor version check that was introduced in later patches.

**Confirmed by:**
- [@marcpicaud](https://github.com/react-hook-form/resolvers/issues/813#issuecomment-3240288388)
- [@hasahmad](https://github.com/react-hook-form/resolvers/issues/813#issuecomment-3260570140)
- [@eddysims](https://github.com/react-hook-form/resolvers/issues/813#issuecomment-3321509581)
- [@npearson72](https://github.com/react-hook-form/resolvers/issues/813#issuecomment-3395198677)
- [@alexasomba](https://github.com/react-hook-form/resolvers/issues/813#issuecomment-3395205020)

### Solution 2: Use standardSchemaResolver (WORKAROUND)

**Source:** [Issue #768](https://github.com/react-hook-form/resolvers/issues/768#issuecomment-2845176597)

Since Zod v4 supports the Standard Schema specification, you can use `standardSchemaResolver` instead:

```typescript
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, { message: 'Required' }),
  age: z.number().min(10),
});

const form = useForm({
  resolver: standardSchemaResolver(schema),
  // Note: You'll need to manually specify types
  // Type inference is not automatic with standardSchemaResolver
});
```

**Advantages:**
- Works with latest versions of both packages
- No version downgrade needed

**Disadvantages:**
- Type inference is not automatic - you may need to manually specify `useForm<z.infer<typeof schema>>()`
- Less convenient than zodResolver

**Confirmed by:**
- [@BLucky-gh](https://github.com/react-hook-form/resolvers/issues/768#issuecomment-2845176597)
- [@igomonteiro](https://github.com/react-hook-form/resolvers/issues/768#issuecomment-2878432002)
- [@semet](https://github.com/react-hook-form/resolvers/issues/768#issuecomment-2878432639)

### Solution 3: Pin Zod to 4.0.x (NOT RECOMMENDED)

One user suggested using Zod `~4.0.17` to match the expected version:

**Source:** [Issue #813](https://github.com/react-hook-form/resolvers/issues/813#issuecomment-3326197819)

```json
{
  "dependencies": {
    "zod": "~4.0.17"  // Locks to 4.0.x
  }
}
```

**Why NOT recommended:**
- You lose Zod 4.1.x features and bug fixes
- You're using Zod 4.1.12 for a reason
- Doesn't solve the underlying compatibility issue

---

## Breaking Changes & Migration

### From Zod v3 to v4 with React Hook Form

**Source:** [Zod v4 Migration Guide](https://v4.zod.dev/v4/changelog)

**Important Changes:**
1. **Import paths:** You can now import from `zod/v4` explicitly
2. **Type inference:** Types are now inferred from schema - don't manually specify generics
3. **Error handling:** Error structure has changed slightly

**Example:**
```typescript
// ❌ OLD (Zod v3 style)
const form = useForm<z.infer<typeof schema>>({
  resolver: zodResolver(schema),
});

// ✅ NEW (Zod v4 style)
const form = useForm({
  resolver: zodResolver(schema),
  // Types are automatically inferred from schema
});
```

**Source:** [Issue #4992](https://github.com/colinhacks/zod/issues/4992#issuecomment-3122173436)

### Known Issues with Zod v4 + @hookform/resolvers

**From Issue #813 and #768:**

1. **Schemas with `.default()`** - May cause type inference issues
2. **Discriminated unions** - Fixed in 5.2.1 but may still have edge cases
3. **Transform schemas** - Works differently between v3 and v4
4. **ZodType generic constraint** - Avoid explicitly typing schemas as `ZodType<T>`

---

## Official Documentation

### React Hook Form Resolvers README
**Source:** [GitHub README](https://github.com/react-hook-form/resolvers)

**Zod Example (from official docs):**
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod'; // or 'zod/v4'

const schema = z.object({
  name: z.string().min(1, { message: 'Required' }),
  age: z.number().min(10),
});

const App = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  return (
    <form onSubmit={handleSubmit((d) => console.log(d))}>
      <input {...register('name')} />
      {errors.name?.message && <p>{errors.name?.message}</p>}
      <input type="number" {...register('age', { valueAsNumber: true })} />
      {errors.age?.message && <p>{errors.age?.message}</p>}
      <input type="submit" />
    </form>
  );
};
```

---

## Minimum Version Requirements

### For Zod v4 Support

Based on research:

| Package | Minimum Version | Notes |
|---------|----------------|-------|
| @hookform/resolvers | 5.1.0 | First version with Zod v4 support |
| @hookform/resolvers | **5.2.0** | **Recommended for Zod 4.1.x** |
| react-hook-form | 7.55.0 | Required by resolvers v5.0+ |
| zod | 4.0.0+ | Official Zod v4 |

### For Zod v3 Support with v5.x resolvers

| Package | Minimum Version | Notes |
|---------|----------------|-------|
| zod | 3.25.0 | Minimum for @hookform/resolvers 5.1.0+ |
| | | (adds zod/v4/core export path) |

**Source:** [Issue #811](https://github.com/react-hook-form/resolvers/issues/811)

---

## Current Status & Future

### Open Issues

1. **Issue #813** - Type error when used with Zod v4
   - Status: Open
   - Affects: @hookform/resolvers 5.2.1 and 5.2.2 with Zod 4.1.x
   - Last activity: October 22, 2025

2. **Issue #768** - Zod 4 support
   - Status: Closed (but discussion continues)
   - Many users still using standardSchemaResolver as workaround

### Expected Fix

The @hookform/resolvers maintainers will likely need to:
1. Update type definitions to accept Zod 4.1.x
2. Remove or relax the strict minor version check
3. Release as v5.2.3 or v5.3.0

**No ETA available** as of October 23, 2025.

---

## Recommended Action Plan

### For Your Project (Using Zod 4.1.12)

**OPTION 1: Downgrade resolvers (Recommended)**
```bash
# 1. Update package.json
# "dependencies": {
#   "@hookform/resolvers": "5.2.0"  // Remove ^ if present
# }

# 2. Clean install
rm -rf node_modules package-lock.json  # or yarn.lock, pnpm-lock.yaml
npm install
```

**OPTION 2: Use standardSchemaResolver**
```typescript
// Change imports
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';

// Update useForm call
const form = useForm<z.infer<typeof schema>>({
  resolver: standardSchemaResolver(schema),
  defaultValues: {...}
});
```

**OPTION 3: Wait and monitor**
- Watch issue #813 for updates
- Keep @hookform/resolvers at 5.2.2
- Update when fix is released

---

## Additional Resources

- **Zod v4 Documentation:** https://v4.zod.dev
- **React Hook Form Documentation:** https://react-hook-form.com/docs/useform#resolver
- **@hookform/resolvers GitHub:** https://github.com/react-hook-form/resolvers
- **Issue #768 (Zod 4 Support):** https://github.com/react-hook-form/resolvers/issues/768
- **Issue #813 (Type Error):** https://github.com/react-hook-form/resolvers/issues/813
- **Issue #4992 (Zod repo):** https://github.com/colinhacks/zod/issues/4992

---

## Testing Checklist

After applying the fix, verify:

- [ ] TypeScript compilation succeeds without errors
- [ ] Form validation works correctly
- [ ] Error messages display properly
- [ ] Type inference works for your schemas
- [ ] No runtime errors in browser console
- [ ] Watch mode doesn't show type errors
- [ ] Build process completes successfully

---

## Conclusion

The issue you're experiencing is a **known compatibility problem** between @hookform/resolvers 5.2.2 and Zod 4.1.x. The library was built against Zod 4.0.x and includes a strict minor version check that fails with Zod 4.1.x.

**Immediate Solution:** Downgrade to @hookform/resolvers 5.2.0 (confirmed working by multiple users)

**Alternative:** Use standardSchemaResolver instead of zodResolver

**Long-term:** Monitor issue #813 for an official fix from the maintainers
