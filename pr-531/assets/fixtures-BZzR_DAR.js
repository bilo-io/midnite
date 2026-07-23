const f={tag:"WEB",color:"#7c3aed"},j=new Map([["proj-web",{tag:"WEB",color:"#7c3aed"}],["proj-gw",{tag:"GATEWAY",color:"#0ea5e9"}],["proj-docs",{tag:"DOCS",color:"#facc15"}]]),A={id:"proj-web",name:"Midnite Web",description:"Next.js kanban front-end: board, sessions, workflows, and the project planner.",tag:"WEB",color:"#7c3aed",workDir:"~/Dev/midnite/packages/web",plan:`# Plan

- [x] Board view
- [ ] Storybook`,planUpdatedAt:"2026-06-10T09:00:00.000Z",createdAt:"2026-05-01T09:00:00.000Z",updatedAt:"2026-06-10T09:00:00.000Z",taskCount:12},T={id:"proj-min",name:"Scratchpad",tag:"SCRATCH",color:"#64748b",createdAt:"2026-06-01T09:00:00.000Z",updatedAt:"2026-06-01T09:00:00.000Z",taskCount:0};function a(o,d,c,l){return{id:`${o}-link-${d}`,taskId:o,url:c,kind:l,createdAt:"2026-06-01T10:00:00.000Z"}}const i={id:"task-feature",priority:2,retryCount:0,fixAttempts:0,title:"Wire the session transcript modal into the board",kind:"feature",status:"wip",projectId:"proj-web",tags:["frontend","ui"],events:[],links:[a("task-feature",1,"https://github.com/acme/midnite/pull/42","github"),a("task-feature",2,"https://www.figma.com/design/abc/midnite","figma")]},n={id:"task-bug",priority:3,retryCount:1,fixAttempts:0,title:"Theme toggle menu clips behind the page header",kind:"bug",status:"todo",projectId:"proj-web",tags:["regression","theming"],events:[],links:[a("task-bug",1,"https://github.com/acme/midnite/issues/77","github")]},p={id:"task-question",priority:0,retryCount:0,fixAttempts:0,title:"Should abandoned tasks count toward the project donut?",kind:"question",status:"backlog",projectId:"proj-docs",tags:[],events:[]},u={id:"task-answered",priority:1,retryCount:0,fixAttempts:0,title:"What does the scheduler tick interval default to?",kind:"question",status:"done",tags:[],events:[{at:"2026-06-22T00:00:00Z",kind:"task.created"},{at:"2026-06-22T00:00:01Z",kind:"answer",data:{text:"It defaults to **2000ms**, configurable via `scheduler.tickMs`."}}]},g={id:"task-chore",priority:1,retryCount:0,fixAttempts:0,title:"Bump drizzle-kit and regenerate migration metadata",kind:"chore",status:"waiting",projectId:"proj-gw",tags:[],events:[]},m={id:"task-unknown",priority:1,retryCount:0,fixAttempts:0,title:"Investigate flaky heartbeat scheduler test",status:"backlog",tags:[],events:[]},r={id:"task-done",priority:1,retryCount:0,fixAttempts:0,title:"Two-stage page reveal animation",kind:"feature",status:"done",projectId:"proj-web",tags:[],events:[]},k={id:"task-abandoned",priority:2,retryCount:3,fixAttempts:0,title:"Tailwind v4 migration spike",kind:"chore",status:"abandoned",projectId:"proj-web",archivedAt:"2026-06-01T12:00:00.000Z",tags:[],events:[]},v=[p,u,m,n,{...n,id:"task-bug-2",title:"Source icon favicon fallback flashes on load",projectId:"proj-gw"},i,{...i,id:"task-feature-2",title:"Workflow run-state borders on canvas nodes",links:void 0},g,r,{...r,id:"task-done-2",title:"Favicon + dark mode polish",kind:"bug",projectId:"proj-docs"},k],s=Date.now(),t={id:"sess-running",projectSlug:"midnite",projectDisplay:"midnite",title:"Fix board drag-and-drop ordering",subtitle:"packages/web — feature/board-dnd",status:"running",lastActivity:s-9e4,contextTokens:84e3,contextLimit:2e5},e={id:"sess-waiting",projectSlug:"midnite",projectDisplay:"midnite",title:"Add terminal REST controller",subtitle:"packages/gateway — awaiting permission approval",status:"waiting",lastActivity:s-12*6e4,contextTokens:132e3,contextLimit:2e5},b={id:"sess-completed",projectSlug:"ekko",projectDisplay:"ekko",title:"Refactor OpenGraph fetcher",subtitle:"packages/gateway",status:"completed",lastActivity:s-3*36e5,contextTokens:187e3,contextLimit:2e5},h={id:"sess-idle",projectSlug:"scratch",projectDisplay:"scratch",title:"Spike: memory search indexing",subtitle:"",status:"idle",lastActivity:s-2*864e5},x=[t,e,b,h],S={id:"wf-triage",name:"On-done triage",description:"When a task finishes, labels stale tasks and pings the board channel with a digest.",enabled:!0,triggerType:"task-event",nodeCount:4,steps:[{type:"trigger.task-event",label:"Task done"},{type:"ai.claude",label:"Triage"},{type:"logic.branch"},{type:"http.request",label:"Notify"}],lastRunAt:"2026-06-11T02:00:00.000Z",lastRunStatus:"succeeded",createdAt:"2026-05-01T09:00:00.000Z",updatedAt:"2026-06-11T02:00:00.000Z"},Z={id:"wf-deploy",name:"Deploy notifier",description:"Posts a summary when the deploy webhook fires.",enabled:!0,triggerType:"webhook",nodeCount:7,steps:[{type:"trigger.webhook"},{type:"logic.branch"},{type:"http.request"},{type:"ai.claude"},{type:"http.request"},{type:"logic.branch"},{type:"http.request",label:"Post"}],lastRunAt:"2026-06-10T16:30:00.000Z",lastRunStatus:"failed",createdAt:"2026-05-10T09:00:00.000Z",updatedAt:"2026-06-10T16:30:00.000Z"},C={id:"wf-release",name:"Release checklist",enabled:!1,triggerType:"manual",nodeCount:2,steps:[{type:"trigger.manual",label:"Start"},{type:"http.request",label:"Run"}],createdAt:"2026-06-01T09:00:00.000Z",updatedAt:"2026-06-01T09:00:00.000Z"},I=`# Heading one

Some lead paragraph with **bold**, _italic_, ~~strikethrough~~, \`inline code\`,
and a [link](https://example.com).

## Heading two

> A blockquote with a thought worth keeping.

### Section label

- Bullet one
- Bullet two
  1. Nested ordered
  2. Another

#### Task list

- [x] Shipped
- [ ] Not yet

| Column | Baseline | Target |
| --- | --- | --- |
| Speed | 4s | 1s |
| Errors | 12 | 0 |

\`\`\`ts
export function add(a: number, b: number): number {
  return a + b;
}
\`\`\`

---

Done.
`,D={id:"mem-style",title:"House TypeScript style",content:"# House style\n\nPrefer `type` for object shapes; discriminated unions for state.\nAlways `import type` for type-only imports.",projectId:null,sources:[{id:"mem-src-1",memoryId:"mem-style",url:"https://github.com/acme/midnite/blob/main/CLAUDE.md",kind:"github",createdAt:"2026-05-01T09:00:00.000Z"}],createdAt:"2026-05-01T09:00:00.000Z",updatedAt:"2026-06-09T09:00:00.000Z"},W={id:"mem-web-routing",title:"Web routing conventions",content:"# Routing\n\nApp Router only. Server components by default; mark client components with `use client`.",projectId:"proj-web",sources:[],createdAt:"2026-05-20T09:00:00.000Z",updatedAt:"2026-06-12T09:00:00.000Z"},R={id:"mem-old",title:"Legacy Vite build notes",content:"Superseded by the Next.js migration — kept for reference.",projectId:"proj-web",sources:[],archived:!0,createdAt:"2026-04-01T09:00:00.000Z",updatedAt:"2026-04-30T09:00:00.000Z"},y={id:t.id,name:t.title,project:t.projectDisplay,status:t.status,activity:t.subtitle,session:t},w={id:e.id,name:e.title,project:e.projectDisplay,status:e.status,activity:e.subtitle,session:e},q=[y,w];export{R as a,D as b,W as c,T as d,f as e,j as f,h as g,t as h,e as i,x as j,n as k,g as l,I as m,r as n,q as o,A as p,i as q,p as r,b as s,u as t,m as u,v,C as w,S as x,Z as y};
