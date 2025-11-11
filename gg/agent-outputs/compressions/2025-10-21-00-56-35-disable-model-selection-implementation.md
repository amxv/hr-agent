# Session Compression: 2025-10-21 - DISABLE_MODEL_SELECTION Feature Implementation

## Session Overview

Successfully implemented a comprehensive feature flag system (`DISABLE_MODEL_SELECTION`) that allows administrators to disable model selection UI and enforce fixed models across the entire AI chat application. The implementation includes frontend UI hiding, route blocking via middleware, and backend enforcement to ensure users cannot bypass the restrictions. The system supports separate model configuration for chat, deep research, and image generation operations using Vercel AI Gateway model IDs.

## Key Learnings

### Model Selection Architecture
- **Model Flow**: User selects model → Persisted to cookie via `/api/chat-model` → Included in message metadata → Backend extracts and uses model
- **Critical Backend Enforcement Point**: `app/(chat)/api/chat/route.ts:179-196` - where selectedModel is extracted from message metadata
- **Provider System**: All models use Vercel AI Gateway with format `provider/model-name` (e.g., `openai/gpt-5-nano`, `anthropic/claude-3.5-sonnet`)
- **Multiple Model Types**: System uses different models for different purposes:
  - Chat messages: `DEFAULT_CHAT_MODEL`
  - Deep research: Configured via `lib/ai/tools/deep-research/configuration.ts`
  - Image generation: `DEFAULT_IMAGE_MODEL` in `lib/ai/tools/generate-image.ts`
  - PDF processing: `DEFAULT_PDF_MODEL`
  - Follow-up suggestions: `DEFAULT_FOLLOWUP_SUGGESTIONS_MODEL`

### State Management Pattern
- **Two-Layer Model State**:
  1. `DefaultModelProvider` - Global model state with cookie persistence
  2. `ChatInputProvider` - Local input state, uses global model as source of truth
- **Optimistic Updates**: UI updates immediately, API calls in background, rollback on failure
- **Auto-Switching**: When users attach PDFs/images, app auto-switches to compatible models (this won't work when selection is disabled)

### Navigation Structure
- **Three Access Points for Model Selection**:
  1. Sidebar: `components/app-sidebar.tsx:36-45`
  2. Header (desktop): `app/(models)/models-header.tsx:63-87`
  3. Header (mobile dropdown): `app/(models)/models-header.tsx:114-134`
- **Two Model-Related Routes**:
  1. `/models` - Browse all available models
  2. `/compare` - Compare model specs side-by-side

### Environment Variable System
- Uses `@t3-oss/env-nextjs` for type-safe environment variable parsing
- Boolean env vars require explicit string comparison: `process.env.VAR === "true"`
- Client-side env vars must be prefixed with `NEXT_PUBLIC_`
- Server and client have separate env var definitions

## Implementation Details

### Files Modified (10 Total)

#### 1. `lib/env.ts` (Lines 6-84)
**Purpose**: Add environment variable definitions and validation

**Changes**:
- Added 4 server environment variables:
  - `DISABLE_MODEL_SELECTION: z.boolean().optional().default(false)`
  - `CHAT_MODEL: z.string().optional()`
  - `DEEPRESEARCH_MODEL: z.string().optional()`
  - `IMAGE_GEN_MODEL: z.string().optional()`
- Added 1 client environment variable:
  - `NEXT_PUBLIC_DISABLE_MODEL_SELECTION: z.boolean().optional()`
- Configured runtimeEnv mappings with proper boolean parsing

**Why**: Centralize configuration and enable type-safe access across the app

---

#### 2. `middleware.ts` (Lines 1-4, 55-60)
**Purpose**: Block access to model selection pages when feature is disabled

**Changes**:
- Imported `env` from `@/lib/env`
- Added redirect logic for `/models` and `/compare` routes:
  ```typescript
  if (isOnModels || isOnCompare) {
    if (env.DISABLE_MODEL_SELECTION) {
      return NextResponse.redirect(new URL("/", url));
    }
    return;
  }
  ```

**Why**: Prevent users from accessing model browsing/comparison pages via direct URL navigation

---

#### 3. `components/app-sidebar.tsx` (Lines 1-18, 37-48)
**Purpose**: Hide "Models" link from sidebar navigation

**Changes**:
- Imported `env` from `@/lib/env`
- Wrapped "Models" sidebar item in conditional:
  ```typescript
  {!env.NEXT_PUBLIC_DISABLE_MODEL_SELECTION && (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip="Models">
        <Link href="/models">...</Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )}
  ```

**Why**: Remove UI navigation to model selection pages

---

#### 4. `app/(models)/models-header.tsx` (Lines 1-18, 64-86, 114-134)
**Purpose**: Hide "Models" and "Compare" links from header navigation (both desktop and mobile)

**Changes**:
- Imported `env` from `@/lib/env`
- Wrapped desktop nav links in conditional (lines 64-86)
- Wrapped mobile dropdown menu items in conditional (lines 114-134)

**Why**: Remove all header navigation paths to model selection features

---

#### 5. `components/multimodal-input.tsx` (Lines 23-54, 706-712)
**Purpose**: Hide model selector dropdown from chat input toolbar

**Changes**:
- Imported `env` from `@/lib/env`
- Wrapped `ModelSelector` component in conditional:
  ```typescript
  {!env.NEXT_PUBLIC_DISABLE_MODEL_SELECTION && (
    <ModelSelector
      className="..."
      onModelChangeAction={onModelChange}
      selectedModelId={selectedModelId}
    />
  )}
  ```

**Why**: Remove the primary UI control for model selection

---

#### 6. `providers/default-model-provider.tsx` (Lines 1-13, 33-46)
**Purpose**: Disable model changes and enforce fixed model from environment

**Changes**:
- Imported `env` from `@/lib/env`
- Calculate fixed model at provider initialization:
  ```typescript
  const fixedModel = env.NEXT_PUBLIC_DISABLE_MODEL_SELECTION && env.CHAT_MODEL
    ? (env.CHAT_MODEL as AppModelId)
    : initialModel;
  ```
- Early return in `changeModel` when feature is disabled:
  ```typescript
  if (env.NEXT_PUBLIC_DISABLE_MODEL_SELECTION) {
    return;
  }
  ```

**Why**: Prevent model changes via the global model context and enforce fixed model

---

#### 7. `providers/chat-input-provider.tsx` (Lines 1-18, 85-94)
**Purpose**: Initialize chat input with fixed model from environment

**Changes**:
- Imported `env` from `@/lib/env`
- Calculate fixed model before state initialization:
  ```typescript
  const fixedModel = env.NEXT_PUBLIC_DISABLE_MODEL_SELECTION && env.CHAT_MODEL
    ? (env.CHAT_MODEL as AppModelId)
    : defaultModel;

  const [selectedModelId, setSelectedModelId] = useState<AppModelId>(
    overrideModelId || fixedModel
  );
  ```

**Why**: Ensure chat input always starts with the configured fixed model

---

#### 8. `app/(chat)/api/chat/route.ts` (Lines 179-196)
**Purpose**: **CRITICAL - Backend enforcement of fixed model**

**Changes**:
- Override client-provided model with environment model:
  ```typescript
  let selectedModelId = userMessage.metadata?.selectedModel as AppModelId;

  // Override with env model if DISABLE_MODEL_SELECTION is enabled
  if (env.DISABLE_MODEL_SELECTION && env.CHAT_MODEL) {
    selectedModelId = env.CHAT_MODEL as AppModelId;
    log.info(
      { forcedModel: selectedModelId },
      "Model selection disabled - using configured CHAT_MODEL"
    );
  }
  ```

**Why**: **SECURITY** - Prevent users from bypassing frontend restrictions by sending custom model IDs in API requests. This is the critical enforcement point.

---

#### 9. `lib/ai/tools/deep-research/configuration.ts` (Lines 55-65)
**Purpose**: Support DEEPRESEARCH_MODEL environment variable for deep research operations

**Changes**:
- Added override logic at start of `loadConfigFromEnv()`:
  ```typescript
  if (process.env.DEEPRESEARCH_MODEL) {
    envConfig.research_model = process.env.DEEPRESEARCH_MODEL;
    envConfig.summarization_model = process.env.DEEPRESEARCH_MODEL;
    envConfig.compression_model = process.env.DEEPRESEARCH_MODEL;
    envConfig.final_report_model = process.env.DEEPRESEARCH_MODEL;
    envConfig.status_update_model = process.env.DEEPRESEARCH_MODEL;
  }
  ```

**Why**: Allow simple override of all deep research models with a single environment variable (individual model env vars still work for fine-grained control)

---

#### 10. `lib/ai/tools/generate-image.ts` (Lines 22-23, 137)
**Purpose**: Support IMAGE_GEN_MODEL environment variable for image generation

**Changes**:
- Added constant after logger initialization:
  ```typescript
  const imageModel = (env.IMAGE_GEN_MODEL || DEFAULT_IMAGE_MODEL) as typeof DEFAULT_IMAGE_MODEL;
  ```
- Updated `experimental_generateImage` call to use `imageModel` instead of `DEFAULT_IMAGE_MODEL`

**Why**: Allow overriding the image generation model via environment variable

---

#### 11. `.env.example` (Lines 49-57) - BONUS
**Purpose**: Document new environment variables for other developers

**Changes**:
- Added comprehensive documentation:
  ```bash
  # Model Selection Control
  # Set to true to disable model selection UI and enforce fixed models
  DISABLE_MODEL_SELECTION=false

  # Fixed models to use when DISABLE_MODEL_SELECTION=true
  # Use Vercel AI Gateway model IDs (e.g., "openai/gpt-5-nano", "anthropic/claude-3.5-sonnet")
  CHAT_MODEL=openai/gpt-5-nano
  DEEPRESEARCH_MODEL=openai/gpt-5-nano
  IMAGE_GEN_MODEL=google/gemini-2.5-flash-image
  ```

**Why**: Help future developers understand the feature and configure it correctly

## Technical Decisions

### Decision 1: Environment Variable Approach
- **Context**: Need to configure fixed models that can be easily changed per environment (dev, staging, prod)
- **Decision**: Use environment variables with Vercel AI Gateway model IDs
- **Rationale**:
  - Vercel AI Gateway already uses string model IDs (e.g., `openai/gpt-5-nano`)
  - No code changes required to switch models, just env var update
  - Follows existing pattern in the codebase
  - Works seamlessly with Vercel deployment
- **Trade-offs**:
  - Model IDs must be manually validated (typos will cause runtime errors)
  - No compile-time checking of model availability
  - Alternative considered: Hardcoded constants (rejected - requires code changes to switch models)

### Decision 2: Separate Models for Different Use Cases
- **Context**: Different operations (chat, research, image gen) may benefit from different models
- **Decision**: Provide three separate environment variables: `CHAT_MODEL`, `DEEPRESEARCH_MODEL`, `IMAGE_GEN_MODEL`
- **Rationale**:
  - Chat might use a faster, cheaper model (gpt-5-nano)
  - Deep research might use the same or a different model depending on needs
  - Image generation requires a completely different model type
  - Flexibility without complexity
- **Trade-offs**:
  - More env vars to configure
  - Alternative considered: Single model for everything (rejected - too limiting)

### Decision 3: Frontend + Backend Enforcement
- **Context**: Users could potentially bypass frontend restrictions
- **Decision**: Implement both UI hiding AND backend enforcement
- **Rationale**:
  - UI hiding improves UX (users don't see options they can't use)
  - Backend enforcement provides security (users can't bypass via API)
  - Defense in depth approach
  - Logged enforcement events for monitoring
- **Trade-offs**:
  - More code to maintain
  - Slight duplication of logic
  - Alternative considered: Backend-only enforcement (rejected - poor UX, users would see disabled UI)

### Decision 4: Middleware Route Blocking
- **Context**: Users could navigate directly to `/models` or `/compare` URLs
- **Decision**: Redirect blocked routes in middleware
- **Rationale**:
  - Middleware runs before page load, preventing wasted rendering
  - Consistent with Next.js patterns
  - Clean redirect to home page
  - No 404 errors or broken states
- **Trade-offs**:
  - Middleware adds a check to every request
  - Alternative considered: Client-side redirect (rejected - flash of content, SEO issues)

### Decision 5: Deep Research Model Configuration Pattern
- **Context**: Deep research already has fine-grained model env vars (RESEARCH_MODEL, SUMMARIZATION_MODEL, etc.)
- **Decision**: Add `DEEPRESEARCH_MODEL` as a convenience override that sets all sub-models, but preserve fine-grained vars for advanced use
- **Rationale**:
  - Simplicity for common case (use same model for everything)
  - Flexibility for advanced users (override individual models)
  - Backward compatible with existing configuration
  - Follows principle of "simple by default, powerful when needed"
- **Trade-offs**:
  - Slightly more complex configuration logic
  - Need to document precedence (individual vars override the general one)
  - Alternative considered: Replace all individual vars (rejected - breaks existing configurations)

## Research Documents

### Codebase Research
- **`/Users/ashray/code/amxv/agentdune-chat/gg/agent-outputs/codebase-researcher/2025-10-21_chat-infrastructure-research.md`**
  - Comprehensive documentation of chat infrastructure, Vercel AI SDK integration, and model selection
  - **Key sections**:
    - Model selection data flow (frontend → cookie → message metadata → backend)
    - Provider system using Vercel AI Gateway
    - State management architecture (DefaultModelProvider + ChatInputProvider)
    - Tool availability based on model capabilities
    - Anonymous user restrictions
    - Reasoning model variants
  - **Why important**: Essential reference for understanding how model selection works in the codebase
  - **Token count**: ~40k tokens (comprehensive)

## Work Status

### Completed ✅
- [x] Added environment variable definitions to `lib/env.ts`
- [x] Implemented middleware route blocking for `/models` and `/compare`
- [x] Hidden "Models" link from sidebar navigation
- [x] Hidden "Models" and "Compare" links from header (desktop + mobile)
- [x] Hidden model selector dropdown from chat input
- [x] Disabled model changes in DefaultModelProvider
- [x] Configured ChatInputProvider to use fixed model
- [x] **Implemented critical backend enforcement in chat API**
- [x] Added DEEPRESEARCH_MODEL support to deep research configuration
- [x] Added IMAGE_GEN_MODEL support to image generation tool
- [x] Documented new env vars in `.env.example`
- [x] Verified dev server compiles successfully with changes

### Testing Required ⚠️
- [ ] Test with `DISABLE_MODEL_SELECTION=true` in `.env.local`
- [ ] Verify model selector is hidden from chat input
- [ ] Verify `/models` route redirects to home
- [ ] Verify `/compare` route redirects to home
- [ ] Verify sidebar "Models" link is hidden
- [ ] Verify header "Models" and "Compare" links are hidden
- [ ] **Verify backend uses CHAT_MODEL** (check server logs for "Model selection disabled" message)
- [ ] Test deep research uses DEEPRESEARCH_MODEL
- [ ] Test image generation uses IMAGE_GEN_MODEL
- [ ] Verify users cannot change models via any means
- [ ] Test with `DISABLE_MODEL_SELECTION=false` to ensure backward compatibility

### Not Started / Future Enhancements 💡
- [ ] **Anonymous user validation**: When `DISABLE_MODEL_SELECTION=true`, validate that `CHAT_MODEL` is in `ANONYMOUS_LIMITS.AVAILABLE_MODELS` to prevent anonymous users from accessing restricted models
- [ ] **File attachment handling**: Document that auto-model-switching for PDFs/images won't work when model selection is disabled (users should ensure CHAT_MODEL supports all input types)
- [ ] **Admin UI**: Consider adding an admin panel to toggle this feature without redeploying
- [ ] **Model validation**: Add startup validation to check that configured model IDs exist in Vercel AI Gateway
- [ ] **Metrics**: Add telemetry to track when users attempt to change models but are blocked
- [ ] **Documentation**: Create user-facing docs explaining the feature and how to configure it

## Important Files Reference

### Configuration Files
- **`lib/env.ts`** - Central environment variable definitions
  - All environment variables must be defined here
  - Server vars vs client vars distinction is critical
  - Boolean parsing requires `=== "true"` comparison

- **`.env.example`** - Template for environment variables
  - Keep this updated when adding new env vars
  - Include helpful comments and examples

- **`.env.local`** - Local development environment (gitignored)
  - Where you actually set the values for testing
  - NOT committed to git

### Core Implementation Files
- **`middleware.ts`** - Route protection layer
  - Runs on every request before page rendering
  - Critical for blocking direct URL navigation

- **`app/(chat)/api/chat/route.ts`** - **MOST CRITICAL FILE**
  - Lines 179-196: Backend model enforcement
  - This is the security boundary - without this, users could bypass frontend restrictions
  - Logs when model override occurs for monitoring

### Provider/Context Files
- **`providers/default-model-provider.tsx`** - Global model state
  - Manages model selection and cookie persistence
  - `changeModel` function is disabled when feature is enabled

- **`providers/chat-input-provider.tsx`** - Chat input state
  - Uses DefaultModelProvider as source of truth
  - Initializes with fixed model when feature is enabled

### UI Component Files
- **`components/app-sidebar.tsx`** - Left sidebar navigation
  - Lines 37-48: Conditional rendering of Models link

- **`app/(models)/models-header.tsx`** - Header navigation
  - Lines 64-86: Desktop nav links
  - Lines 114-134: Mobile dropdown menu
  - Both must be updated together

- **`components/multimodal-input.tsx`** - Chat input with model selector
  - Lines 706-712: Model selector dropdown
  - This is where users normally select models

### Tool Configuration Files
- **`lib/ai/tools/deep-research/configuration.ts`** - Deep research model config
  - `loadConfigFromEnv()` function processes environment variables
  - DEEPRESEARCH_MODEL overrides all sub-models

- **`lib/ai/tools/generate-image.ts`** - Image generation model config
  - `imageModel` constant reads from env or uses default
  - Line 137: Where model is actually used

### Reference Files (Read-Only)
- **`lib/ai/app-models.ts`** - Model definitions and defaults
  - Lines 132-150: All default model constants
  - `DEFAULT_CHAT_MODEL`, `DEFAULT_PDF_MODEL`, `DEFAULT_IMAGE_MODEL`, etc.
  - `chatModels` array: List of all available chat models
  - `getAppModelDefinition()`: Function to get model metadata

- **`lib/ai/providers.ts`** - Vercel AI Gateway integration
  - `getLanguageModel()`: Creates model instance from ID
  - Provider-specific options for different AI providers

## Next Steps

### Immediate Actions (Do First)
1. **Enable the feature in `.env.local`**:
   ```bash
   DISABLE_MODEL_SELECTION=true
   CHAT_MODEL=openai/gpt-5-nano
   DEEPRESEARCH_MODEL=openai/gpt-5-nano
   IMAGE_GEN_MODEL=google/gemini-2.5-flash-image
   ```

2. **Test all blocked UI elements**:
   - Open app and verify model selector is hidden from chat input
   - Check sidebar for missing "Models" link
   - Check header for missing "Models" and "Compare" links (both desktop and mobile)
   - Try navigating to `/models` directly (should redirect to home)
   - Try navigating to `/compare` directly (should redirect to home)

3. **Test backend enforcement**:
   - Send a chat message
   - Check server logs for "Model selection disabled - using configured CHAT_MODEL" message
   - Verify the response uses the correct model (check response quality/style if you know the models)

4. **Test deep research** (if available in your setup):
   - Trigger a deep research operation
   - Verify it uses the DEEPRESEARCH_MODEL

5. **Test image generation** (if available in your setup):
   - Request an image generation
   - Verify it uses the IMAGE_GEN_MODEL

### Documentation
6. **Document the feature** in a README or docs file:
   - What it does
   - Why you'd use it
   - How to configure it
   - What model IDs are valid
   - How to disable it

### Security Considerations
7. **Add anonymous user model validation**:
   - When `DISABLE_MODEL_SELECTION=true`, validate `CHAT_MODEL` is in `ANONYMOUS_LIMITS.AVAILABLE_MODELS`
   - Add this check in `app/(chat)/api/chat/route.ts` around line 256
   - Prevents anonymous users from accessing premium models via env var misconfiguration

8. **Add startup validation**:
   - Create a validation script that checks if configured model IDs exist
   - Run on app startup or in a health check endpoint
   - Fail fast if invalid model IDs are configured

### Monitoring & Observability
9. **Add metrics** (optional but recommended):
   - Track attempts to access `/models` or `/compare` when feature is disabled
   - Track model override events (already logged, just need to pipe to metrics)
   - Alert if users repeatedly try to bypass restrictions

### Production Deployment
10. **Prepare for production**:
    - Add environment variables to Vercel project settings
    - Test in staging environment first
    - Document rollback procedure (set `DISABLE_MODEL_SELECTION=false`)
    - Communicate to users if this affects their experience

## Additional Notes

### Model ID Format
All model IDs must follow the Vercel AI Gateway format: `provider/model-name`

**Valid Examples**:
- `openai/gpt-5-nano`
- `openai/gpt-5-mini`
- `openai/gpt-4o`
- `anthropic/claude-3.5-sonnet`
- `anthropic/claude-opus-4`
- `google/gemini-2.5-flash`
- `google/gemini-2.5-flash-image`
- `xai/grok-2`

**Invalid Examples**:
- `gpt-5-nano` (missing provider prefix)
- `openai:gpt-5-nano` (wrong separator, should be `/`)
- `openai/gpt5` (model doesn't exist)

### Reasoning Model Variants
Some models have `-reasoning` variants that enable extended thinking:
- Base model: `openai/gpt-5`
- Reasoning variant: `openai/gpt-5-reasoning`

The system automatically creates both variants for models that support reasoning. When setting env vars, you can specify either variant.

### Backward Compatibility
Setting `DISABLE_MODEL_SELECTION=false` (or omitting it entirely) preserves all original functionality:
- Model selector shows in UI
- All routes are accessible
- Users can change models freely
- No backend override occurs

### User Experience Impact
When `DISABLE_MODEL_SELECTION=true`:
- **Positive**: Simplified UI, no confusion about which model to use
- **Negative**: Users can't optimize model choice for their specific task
- **Neutral**: For most users who don't understand model differences, this is an improvement

### Cost Implications
- Using a cheaper model like `gpt-5-nano` for all operations can significantly reduce costs
- Deep research is the most expensive operation - consider using a cheaper model
- Image generation requires a vision model - `google/gemini-2.5-flash-image` is cost-effective

### Performance Considerations
- Smaller models (nano, mini) are generally faster but less capable
- Larger models (gpt-5, claude-opus-4) are slower but produce better results
- Balance cost, speed, and quality based on your use case

### File Attachment Compatibility
**WARNING**: When model selection is disabled, auto-switching for PDF/image attachments won't work.

**Current behavior (when selection is enabled)**:
- User attaches PDF → App auto-switches to `DEFAULT_PDF_MODEL`
- User attaches image → App auto-switches to `DEFAULT_CHAT_IMAGE_COMPATIBLE_MODEL`

**New behavior (when selection is disabled)**:
- User attaches PDF → Uses `CHAT_MODEL` (might not support PDFs!)
- User attaches image → Uses `CHAT_MODEL` (might not support images!)

**Solution**: Ensure `CHAT_MODEL` supports all input types you need:
- For PDF support: Use models like `openai/gpt-5-mini`, `openai/gpt-4o`, `anthropic/claude-3.5-sonnet`
- For image support: Use vision models like `openai/gpt-4o`, `google/gemini-2.5-flash`

**Alternative**: Disable file attachments when model selection is disabled (not currently implemented)

### Deep Research Model Configuration
Deep research supports fine-grained model configuration via individual environment variables:
- `RESEARCH_MODEL` - Main research model
- `SUMMARIZATION_MODEL` - For summarizing findings
- `COMPRESSION_MODEL` - For compressing context
- `FINAL_REPORT_MODEL` - For generating final report
- `STATUS_UPDATE_MODEL` - For status messages

**Precedence**: Individual model env vars take precedence over `DEEPRESEARCH_MODEL`.

**Example** - Use cheap model for most tasks, expensive model for final report:
```bash
DEEPRESEARCH_MODEL=openai/gpt-5-nano
FINAL_REPORT_MODEL=openai/gpt-5
```

## Commands to Run

### Enable the feature
```bash
# Add to .env.local
echo "DISABLE_MODEL_SELECTION=true" >> .env.local
echo "CHAT_MODEL=openai/gpt-5-nano" >> .env.local
echo "DEEPRESEARCH_MODEL=openai/gpt-5-nano" >> .env.local
echo "IMAGE_GEN_MODEL=google/gemini-2.5-flash-image" >> .env.local
```

### Restart dev server to apply changes
```bash
# Stop current dev server (Ctrl+C) then:
bun dev
```

### Check server logs for model override
```bash
# Look for this message in the logs:
# "Model selection disabled - using configured CHAT_MODEL"
```

### Verify model IDs are valid (manual check)
```bash
# List available models (if you have a script for this)
# OR check documentation at https://vercel.com/docs/ai-gateway
```

### Rollback if needed
```bash
# Set in .env.local or remove the line entirely:
echo "DISABLE_MODEL_SELECTION=false" >> .env.local
# OR
grep -v "DISABLE_MODEL_SELECTION" .env.local > .env.local.tmp && mv .env.local.tmp .env.local
```

## References

### Documentation
- **Vercel AI Gateway Docs**: https://vercel.com/docs/ai-gateway
- **Vercel AI SDK Docs**: https://sdk.vercel.ai/docs
- **Model IDs Reference**: Check `packages/models/responses/models-dev/models.json` for all available models

### Related Code
- **Anonymous Limits**: `lib/types/anonymous.ts` - Defines which models anonymous users can access
- **Model Costs**: Search codebase for `getBaseModelCostByModelId` to understand pricing
- **Model Capabilities**: `lib/ai/app-models.ts` - See `input` and `output` properties on model definitions

### Prior Research
- **Chat Infrastructure Research**: `/Users/ashray/code/amxv/agentdune-chat/gg/agent-outputs/codebase-researcher/2025-10-21_chat-infrastructure-research.md`
  - Complete documentation of how chat and model selection works
  - Essential reading for understanding the architecture

### Git Commit Message (Suggestion)
```
feat: add DISABLE_MODEL_SELECTION feature flag

- Add environment variables for disabling model selection and enforcing fixed models
- Hide model selector UI when feature is enabled
- Block /models and /compare routes via middleware
- Enforce fixed models on backend to prevent API bypass
- Support separate models for chat, deep research, and image generation
- Update .env.example with documentation

Breaking: None (feature is opt-in via env var)
```

## Session Metadata

- **Date**: 2025-10-21
- **Time**: ~21:00 - 00:56 UTC (approximately 4 hours)
- **Files Modified**: 11 files (10 code files + 1 example file)
- **Lines Changed**: ~150 lines total (mostly additions, minimal deletions)
- **Compilation Status**: ✅ All changes compiled successfully
- **Test Status**: ⚠️ Manual testing required (implementation complete, testing pending)
- **Dev Server Status**: ✅ Running and operational at http://localhost:3000

## Success Criteria Met

✅ **Complete**: All planned files modified
✅ **Functional**: Dev server compiles without errors
✅ **Documented**: .env.example updated with clear documentation
✅ **Comprehensive**: Frontend hiding + Backend enforcement implemented
✅ **Flexible**: Supports separate models for different use cases
✅ **Backward Compatible**: Feature is opt-in, doesn't break existing functionality

## Outstanding Issues

⚠️ **PostgreSQL Connection Pool**: Saw errors in dev server logs about connection slots reserved for SUPERUSER. This is unrelated to our changes but should be investigated separately.

⚠️ **Langfuse Authentication**: Multiple 401 errors for Langfuse (telemetry). Not critical but should be configured if telemetry is needed.

⚠️ **Firecrawl Authentication**: Web search failing due to invalid Firecrawl token. Not related to this feature but affects web search functionality.

## Risk Assessment

**Low Risk**:
- Feature is completely opt-in via environment variable
- No database migrations or schema changes
- No breaking changes to existing APIs
- Easy rollback (just set env var to false)

**Medium Risk**:
- File attachment auto-switching won't work when enabled (documented above)
- Need to validate CHAT_MODEL supports all required input types

**Mitigation**:
- Test thoroughly with feature enabled before production deployment
- Document file attachment limitations
- Consider adding validation for model capabilities
