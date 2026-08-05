import{b1 as A,a_ as t,aL as I}from"./iframe-DJr6MJVv.js";import{i as T}from"./mock-fetch-aFrr3kfG.js";import{U as W}from"./api-DcHHGle2.js";import{u as M}from"./use-polling-joniTwFj.js";import{h as L}from"./i18n-labels-CDUqNqRe.js";import{W as C}from"./spinner-C7w2VkAX.js";import{W as F}from"./widget-card-DiTkdFM4.js";import{S as U}from"./square-terminal-DvIUHs4T.js";import{R as P}from"./refresh-cw-DATbehe7.js";import"./preload-helper-Dp1pzeXC.js";import"./useQuery-5FmduxkR.js";const $=3e4,q=8,k={running:0,waiting:1,idle:2,completed:3},z={running:"bg-emerald-500",waiting:"bg-amber-500",idle:"bg-muted-foreground/40",completed:"bg-sky-500"};function O(){const e=A("sessions"),{data:s,error:n,loading:N,refresh:R}=M(()=>W(),$),D=(s??[]).filter(a=>!a.archivedAt).sort((a,B)=>k[a.status]-k[B.status]||B.lastActivity-a.lastActivity).slice(0,q);return t.jsx(F,{title:e("widget.title"),icon:U,actions:t.jsx("button",{type:"button",onClick:R,"aria-label":e("widget.refresh"),className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:t.jsx(P,{className:I("h-3 w-3",N&&"animate-spin")})}),bodyClassName:"overflow-auto",children:n&&!s?t.jsx("p",{className:"px-4 py-6 text-center text-sm text-destructive",children:e("widget.loadFailed")}):!s&&N?t.jsx(C,{}):D.length===0?t.jsx("p",{className:"px-4 py-6 text-center text-sm text-muted-foreground",children:e("widget.empty")}):t.jsx("ul",{className:"divide-y divide-border/30",children:D.map(a=>t.jsx(G,{session:a},a.id))})})}function G({session:e}){const s=L(),n=e.contextTokens!=null&&e.contextLimit?Math.min(100,Math.round(e.contextTokens/e.contextLimit*100)):null;return t.jsxs("li",{className:"px-4 py-2",children:[t.jsxs("div",{className:"flex items-center gap-2",children:[t.jsx("span",{"aria-hidden":!0,className:I("h-2 w-2 shrink-0 rounded-full",z[e.status])}),t.jsx("span",{className:"min-w-0 flex-1 truncate text-sm font-medium",children:e.title}),t.jsx("span",{className:"shrink-0 text-[11px] tabular-nums text-muted-foreground",children:s(e.lastActivity)})]}),t.jsxs("div",{className:"ml-4 mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground",children:[t.jsx("span",{className:"truncate",children:e.projectDisplay}),t.jsxs("span",{className:"capitalize",children:["· ",e.status]})]}),n!=null&&t.jsx("div",{className:"ml-4 mt-1 h-1 overflow-hidden rounded-full bg-border/50",title:`Context ${n}%`,children:t.jsx("div",{className:"h-full rounded-full bg-primary/60",style:{width:`${n}%`}})})]})}O.__docgenInfo={description:"",methods:[],displayName:"SessionsWidget"};var l,d,m,p,u,v,h,x,f,y,_,g,S,w,E;const{expect:c,within:b}=__STORYBOOK_MODULE_TEST__,j=[{id:"s1",projectSlug:"midnite",projectDisplay:"midnite",title:"Wire up the scheduler tick metric",subtitle:"feature/scheduler-metric",status:"running",lastActivity:1718e9,contextTokens:42e3,contextLimit:2e5},{id:"s2",projectSlug:"midnite",projectDisplay:"midnite",title:"Review the repo registry migration",subtitle:"feature/repo-registry",status:"waiting",lastActivity:17179e8},{id:"s3",projectSlug:"docs",projectDisplay:"docs-app",title:"Draft the Phase 26 plan",subtitle:"docs/phase-26",status:"completed",lastActivity:17178e8}],ae={title:"Widgets/SessionsWidget",component:O,decorators:[e=>t.jsx("div",{className:"h-80 w-80",children:t.jsx(e,{})})]},i={beforeEach:()=>T([{match:"/sessions",json:j}]),play:async({canvasElement:e})=>{const s=b(e);await c(await s.findByText(j[0].title)).toBeInTheDocument(),await c(s.getByText(j[1].title)).toBeInTheDocument()}},o={beforeEach:()=>T([{match:"/sessions",json:[]}]),play:async({canvasElement:e})=>{const s=b(e);await c(await s.findByText("No active sessions.")).toBeInTheDocument()}},r={beforeEach:()=>T([{match:"/sessions",status:500}]),play:async({canvasElement:e})=>{const s=b(e);await c(await s.findByText("Couldn’t load sessions.")).toBeInTheDocument()}};i.parameters={...i.parameters,docs:{...(l=i.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
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
}`,...(m=i.parameters)===null||m===void 0||(d=m.docs)===null||d===void 0?void 0:d.source},description:{story:"Live sessions loaded from the gateway, ordered by liveness.",...(u=i.parameters)===null||u===void 0||(p=u.docs)===null||p===void 0?void 0:p.description}}};o.parameters={...o.parameters,docs:{...(v=o.parameters)===null||v===void 0?void 0:v.docs,source:{originalSource:`{
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
}`,...(x=o.parameters)===null||x===void 0||(h=x.docs)===null||h===void 0?void 0:h.source},description:{story:"No active sessions → the empty-state message.",...(y=o.parameters)===null||y===void 0||(f=y.docs)===null||f===void 0?void 0:f.description}}};r.parameters={...r.parameters,docs:{...(_=r.parameters)===null||_===void 0?void 0:_.docs,source:{originalSource:`{
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
}`,...(S=r.parameters)===null||S===void 0||(g=S.docs)===null||g===void 0?void 0:g.source},description:{story:"Gateway sessions endpoint fails → the error fallback.",...(E=r.parameters)===null||E===void 0||(w=E.docs)===null||w===void 0?void 0:w.description}}};const ne=["Default","Empty","Error"];export{i as Default,o as Empty,r as Error,ne as __namedExportsOrder,ae as default};
