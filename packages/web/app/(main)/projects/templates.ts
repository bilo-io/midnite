/**
 * Built-in document templates surfaced on the Projects page under the "Templates"
 * tab. Each is a self-contained markdown document used as a starting point for
 * drafting a project plan or spec. They're static (no gateway round-trip); the
 * modal lets you read, edit a working copy, and copy the result out.
 */
export type Template = {
  id: string;
  name: string;
  /** Short chip label, mirrors a project's tag. */
  tag: string;
  /** Chip fill color. */
  color: string;
  description: string;
  /** The markdown body. */
  content: string;
};

const PRD = `# Product Requirements Document

## 1. Overview
_One-paragraph summary of what we're building and why it matters now._

## 2. Problem Statement
- **Who** is affected?
- **What** is the pain today?
- **Why** is the status quo not good enough?

## 3. Goals & Non-Goals
### Goals
-

### Non-Goals
-

## 4. Success Metrics
| Metric | Baseline | Target |
| --- | --- | --- |
|  |  |  |

## 5. Personas & Use Cases
- **Persona:**
  - **Use case:**

## 6. Requirements
### Must have
- [ ]

### Should have
- [ ]

### Could have
- [ ]

## 7. User Flows
_Describe the key journeys, step by step._

## 8. Open Questions
-

## 9. Risks & Dependencies
-

## 10. Milestones
| Milestone | Owner | Target date |
| --- | --- | --- |
|  |  |  |
`;

const TECH_SPEC = `# Technical Specification

## 1. Summary
_What this spec covers and the outcome it enables._

## 2. Background & Context
_Links to the PRD, prior art, and any constraints inherited from the system._

## 3. Goals & Non-Goals
### Goals
-

### Non-Goals
-

## 4. Proposed Solution
_The approach in prose. What changes, where, and how the pieces fit._

## 5. API / Interface Changes
\`\`\`
// Endpoints, schemas, or function signatures
\`\`\`

## 6. Data Model
_New tables/fields, migrations, and backward-compatibility notes._

## 7. Alternatives Considered
| Option | Pros | Cons | Decision |
| --- | --- | --- | --- |
|  |  |  |  |

## 8. Rollout Plan
- Feature flags / staged rollout:
- Backfill / migration steps:
- Monitoring & alerts:

## 9. Testing Strategy
- Unit:
- Integration:
- Manual / QA:

## 10. Security & Privacy
_Authn/z, PII handling, threat surface._

## 11. Open Questions
-
`;

const TECH_DESIGN = `# Technical Design Document

## 1. Context
_What problem is this design solving and for whom._

## 2. Requirements
### Functional
-

### Non-Functional
- Performance:
- Reliability:
- Scalability:

## 3. High-Level Architecture
_Diagram or description of the major components and their interactions._

\`\`\`
[component] --> [component] --> [component]
\`\`\`

## 4. Detailed Design
### Component A
_Responsibilities, interfaces, state._

### Component B
_Responsibilities, interfaces, state._

## 5. Data Flow
_Trace a request end to end._

## 6. Trade-offs
| Decision | Why | What we give up |
| --- | --- | --- |
|  |  |  |

## 7. Failure Modes
- **Failure:**
  - **Detection:**
  - **Recovery:**

## 8. Observability
- Metrics:
- Logs:
- Traces:

## 9. Future Work
-
`;

const GAME_DESIGN = `# Game Design Document

## 1. High Concept
_One sentence that sells the game. The hook._

## 2. Genre & Platform
- **Genre:**
- **Platforms:**
- **Target audience:**

## 3. Core Loop
_The repeatable moment-to-moment activity the player engages in._

## 4. Mechanics
- **Mechanic:**
  - **Player input:**
  - **System response:**

## 5. Progression
_How the player grows, unlocks, and is rewarded over time._

## 6. World & Narrative
- **Setting:**
- **Tone:**
- **Key characters:**

## 7. Art & Audio Direction
- **Visual style:**
- **Audio / music:**

## 8. Levels / Content
| Level | Theme | New mechanic | Difficulty |
| --- | --- | --- | --- |
|  |  |  |  |

## 9. UX & Controls
_Input scheme, menus, accessibility considerations._

## 10. Monetization & Scope
- **Model:**
- **MVP scope:**

## 11. Risks
-
`;

/** A fresh, empty template for the "New Template" action. */
export function createBlankTemplate(): Template {
  return {
    id: crypto.randomUUID(),
    name: 'Untitled template',
    tag: 'DOC',
    color: '#6366f1',
    description: '',
    content: '# Untitled\n\n',
  };
}

export const TEMPLATES: Template[] = [
  {
    id: 'prd',
    name: 'Product Requirements Doc',
    tag: 'PRD',
    color: '#6366f1',
    description: 'Define the problem, goals, requirements, and success metrics for a product.',
    content: PRD,
  },
  {
    id: 'tech-spec',
    name: 'Technical Specification',
    tag: 'SPEC',
    color: '#0ea5e9',
    description: 'Specify the solution, APIs, data model, rollout, and testing strategy.',
    content: TECH_SPEC,
  },
  {
    id: 'tech-design',
    name: 'Technical Design Doc',
    tag: 'TDD',
    color: '#10b981',
    description: 'Lay out the architecture, components, data flow, and trade-offs of a system.',
    content: TECH_DESIGN,
  },
  {
    id: 'game-design',
    name: 'Game Design Doc',
    tag: 'GDD',
    color: '#f59e0b',
    description: 'Capture the concept, core loop, mechanics, progression, and world of a game.',
    content: GAME_DESIGN,
  },
];
