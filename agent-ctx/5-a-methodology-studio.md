# Task 5-a: MethodologyStudioView.tsx

## Summary
Created the AI Methodology Generative Studio component at `/home/z/my-project/src/components/dmrv/MethodologyStudioView.tsx`.

## What was built
- **4 tabs**: "AI Generate" (default), "Sessions", "Active Rules", "Builder"
- **AI Generate Tab**:
  - Large textarea for prompt input
  - Methodology select (T-VER, VCS, Gold Standard, CDM, IPCC-2023)
  - Track type select (forest, biochar, awd, biogas, solar) with colored icons
  - "✨ Generate with AI" button with animated loading state
  - Result preview panel: formula display, parameters list, conditions, visual node flowchart
  - "Apply to Methodology" button
  - 4 pre-built prompt templates (Mangrove, Biochar, AWD Rice, Biogas)
- **Sessions Tab**: Collapsible list of all AI sessions with status badges, expand to view formula, params, conditions, node flowchart, apply button
- **Active Rules Tab**: Grid of methodology rules from GET /api/dmrv/methodology with AI badges on AI-generated ones, View/Copy/Deprecate actions
- **Builder Tab**: Manual formula builder with name, methodology, track type, version, description, expression, variables, parameters, conditions
- **Visual Node Flowchart**: `NodeFlowchart` component renders `generatedNodes` (GenNode[] with id/type/label/x/y) as connected cards (input→process→output) with CSS arrow connectors
- **SessionPreview** extracted as reusable sub-component for the AI Generate right panel

## Technical details
- 455 lines total (well under 800 limit)
- Emerald/green color scheme consistent with dMRV platform
- Uses shadcn/ui: Card, Badge, Tabs, Dialog, Input, Label, Textarea, Select, Switch, Separator, Skeleton, ScrollArea, Table, Collapsible
- Uses Lucide icons throughout
- `'use client'` directive at top
- API endpoints: GET/POST `/api/dmrv/ai-methodology`, GET `/api/dmrv/methodology`
- Full TypeScript typing for AIGenerationSession, MethodologyRule, GenNode, etc.
- Lint passes cleanly
