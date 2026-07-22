import{aX as t,aJ as k,b7 as O}from"./iframe-2OGF1UZZ.js";import{i as j}from"./mock-fetch-aFrr3kfG.js";import{R as A}from"./api-CwbHc1_y.js";import{u as W}from"./use-polling-Ch-9qEth.js";import{W as M}from"./spinner-tRhKSqXb.js";import{W as C}from"./widget-card-CwwDii5D.js";import{S as L}from"./square-terminal-CrP8FWRd.js";import{R as F}from"./refresh-cw-DC-zy7_X.js";import"./preload-helper-Dp1pzeXC.js";import"./useQuery-C-OaMkhB.js";const U=3e4,P=8,B={running:0,waiting:1,idle:2,completed:3},X={running:"bg-emerald-500",waiting:"bg-amber-500",idle:"bg-muted-foreground/40",completed:"bg-sky-500"};function I(){const{data:e,error:s,loading:b,refresh:R}=W(()=>A(),U),N=(e??[]).filter(a=>!a.archivedAt).sort((a,D)=>B[a.status]-B[D.status]||D.lastActivity-a.lastActivity).slice(0,P);return t.jsx(C,{title:"Live sessions",icon:L,actions:t.jsx("button",{type:"button",onClick:R,"aria-label":"Refresh sessions",className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:t.jsx(F,{className:k("h-3 w-3",b&&"animate-spin")})}),bodyClassName:"overflow-auto",children:s&&!e?t.jsx("p",{className:"px-4 py-6 text-center text-sm text-destructive",children:"Couldn’t load sessions."}):!e&&b?t.jsx(M,{}):N.length===0?t.jsx("p",{className:"px-4 py-6 text-center text-sm text-muted-foreground",children:"No active sessions."}):t.jsx("ul",{className:"divide-y divide-border/30",children:N.map(a=>t.jsx($,{session:a},a.id))})})}function $({session:e}){const s=e.contextTokens!=null&&e.contextLimit?Math.min(100,Math.round(e.contextTokens/e.contextLimit*100)):null;return t.jsxs("li",{className:"px-4 py-2",children:[t.jsxs("div",{className:"flex items-center gap-2",children:[t.jsx("span",{"aria-hidden":!0,className:k("h-2 w-2 shrink-0 rounded-full",X[e.status])}),t.jsx("span",{className:"min-w-0 flex-1 truncate text-sm font-medium",children:e.title}),t.jsx("span",{className:"shrink-0 text-[11px] tabular-nums text-muted-foreground",children:O(e.lastActivity)})]}),t.jsxs("div",{className:"ml-4 mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground",children:[t.jsx("span",{className:"truncate",children:e.projectDisplay}),t.jsxs("span",{className:"capitalize",children:["· ",e.status]})]}),s!=null&&t.jsx("div",{className:"ml-4 mt-1 h-1 overflow-hidden rounded-full bg-border/50",title:`Context ${s}%`,children:t.jsx("div",{className:"h-full rounded-full bg-primary/60",style:{width:`${s}%`}})})]})}I.__docgenInfo={description:"",methods:[],displayName:"SessionsWidget"};var c,l,d,m,p,u,v,h,x,f,y,_,g,S,E;const{expect:r,within:T}=__STORYBOOK_MODULE_TEST__,w=[{id:"s1",projectSlug:"midnite",projectDisplay:"midnite",title:"Wire up the scheduler tick metric",subtitle:"feature/scheduler-metric",status:"running",lastActivity:1718e9,contextTokens:42e3,contextLimit:2e5},{id:"s2",projectSlug:"midnite",projectDisplay:"midnite",title:"Review the repo registry migration",subtitle:"feature/repo-registry",status:"waiting",lastActivity:17179e8},{id:"s3",projectSlug:"docs",projectDisplay:"docs-app",title:"Draft the Phase 26 plan",subtitle:"docs/phase-26",status:"completed",lastActivity:17178e8}],ee={title:"Widgets/SessionsWidget",component:I,decorators:[e=>t.jsx("div",{className:"h-80 w-80",children:t.jsx(e,{})})]},n={beforeEach:()=>j([{match:"/sessions",json:w}]),play:async({canvasElement:e})=>{const s=T(e);await r(await s.findByText(w[0].title)).toBeInTheDocument(),await r(s.getByText(w[1].title)).toBeInTheDocument()}},o={beforeEach:()=>j([{match:"/sessions",json:[]}]),play:async({canvasElement:e})=>{const s=T(e);await r(await s.findByText("No active sessions.")).toBeInTheDocument()}},i={beforeEach:()=>j([{match:"/sessions",status:500}]),play:async({canvasElement:e})=>{const s=T(e);await r(await s.findByText("Couldn’t load sessions.")).toBeInTheDocument()}};n.parameters={...n.parameters,docs:{...(c=n.parameters)===null||c===void 0?void 0:c.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/sessions',
    json: SESSIONS
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(SESSIONS[0]!.title)).toBeInTheDocument();
    await expect(canvas.getByText(SESSIONS[1]!.title)).toBeInTheDocument();
  }
}`,...(d=n.parameters)===null||d===void 0||(l=d.docs)===null||l===void 0?void 0:l.source},description:{story:"Live sessions loaded from the gateway, ordered by liveness.",...(p=n.parameters)===null||p===void 0||(m=p.docs)===null||m===void 0?void 0:m.description}}};o.parameters={...o.parameters,docs:{...(u=o.parameters)===null||u===void 0?void 0:u.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/sessions',
    json: []
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('No active sessions.')).toBeInTheDocument();
  }
}`,...(h=o.parameters)===null||h===void 0||(v=h.docs)===null||v===void 0?void 0:v.source},description:{story:"No active sessions → the empty-state message.",...(f=o.parameters)===null||f===void 0||(x=f.docs)===null||x===void 0?void 0:x.description}}};i.parameters={...i.parameters,docs:{...(y=i.parameters)===null||y===void 0?void 0:y.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/sessions',
    status: 500
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Couldn’t load sessions.')).toBeInTheDocument();
  }
}`,...(g=i.parameters)===null||g===void 0||(_=g.docs)===null||_===void 0?void 0:_.source},description:{story:"Gateway sessions endpoint fails → the error fallback.",...(E=i.parameters)===null||E===void 0||(S=E.docs)===null||S===void 0?void 0:S.description}}};const te=["Default","Empty","Error"];export{n as Default,o as Empty,i as Error,te as __namedExportsOrder,ee as default};
