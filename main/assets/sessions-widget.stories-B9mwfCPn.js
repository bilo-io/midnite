import{h as R,n as t,f as k,s as A}from"./iframe-CQd7E9rJ.js";import{i as j}from"./mock-fetch-aFrr3kfG.js";import{B as M}from"./api-e81uAW5a.js";import{u as W}from"./use-polling-BBZU1bl5.js";import{W as C}from"./spinner-C6n1qhY-.js";import{W as L}from"./widget-card-D4dC1UWY.js";import{R as F}from"./refresh-cw-akydvQKr.js";import"./preload-helper-Dp1pzeXC.js";import"./inbound-srGy8HMv.js";import"./useQuery-BbZS3zRu.js";/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const U=[["path",{d:"m7 11 2-2-2-2",key:"1lz0vl"}],["path",{d:"M11 13h4",key:"1p7l4v"}],["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2",key:"1m3agn"}]],q=R("square-terminal",U),z=3e4,P=8,B={running:0,waiting:1,idle:2,completed:3},$={running:"bg-emerald-500",waiting:"bg-amber-500",idle:"bg-muted-foreground/40",completed:"bg-sky-500"};function I(){const{data:e,error:s,loading:N,refresh:O}=W(()=>M(),z),b=(e??[]).filter(a=>!a.archivedAt).sort((a,D)=>B[a.status]-B[D.status]||D.lastActivity-a.lastActivity).slice(0,P);return t.jsx(L,{title:"Live sessions",icon:q,actions:t.jsx("button",{type:"button",onClick:O,"aria-label":"Refresh sessions",className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:t.jsx(F,{className:k("h-3 w-3",N&&"animate-spin")})}),bodyClassName:"overflow-auto",children:s&&!e?t.jsx("p",{className:"px-4 py-6 text-center text-sm text-destructive",children:"Couldn’t load sessions."}):!e&&N?t.jsx(C,{}):b.length===0?t.jsx("p",{className:"px-4 py-6 text-center text-sm text-muted-foreground",children:"No active sessions."}):t.jsx("ul",{className:"divide-y divide-border/30",children:b.map(a=>t.jsx(G,{session:a},a.id))})})}function G({session:e}){const s=e.contextTokens!=null&&e.contextLimit?Math.min(100,Math.round(e.contextTokens/e.contextLimit*100)):null;return t.jsxs("li",{className:"px-4 py-2",children:[t.jsxs("div",{className:"flex items-center gap-2",children:[t.jsx("span",{"aria-hidden":!0,className:k("h-2 w-2 shrink-0 rounded-full",$[e.status])}),t.jsx("span",{className:"min-w-0 flex-1 truncate text-sm font-medium",children:e.title}),t.jsx("span",{className:"shrink-0 text-[11px] tabular-nums text-muted-foreground",children:A(e.lastActivity)})]}),t.jsxs("div",{className:"ml-4 mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground",children:[t.jsx("span",{className:"truncate",children:e.projectDisplay}),t.jsxs("span",{className:"capitalize",children:["· ",e.status]})]}),s!=null&&t.jsx("div",{className:"ml-4 mt-1 h-1 overflow-hidden rounded-full bg-border/50",title:`Context ${s}%`,children:t.jsx("div",{className:"h-full rounded-full bg-primary/60",style:{width:`${s}%`}})})]})}I.__docgenInfo={description:"",methods:[],displayName:"SessionsWidget"};var c,l,d,m,p,u,h,v,x,y,f,_,g,E,S;const{expect:r,within:T}=__STORYBOOK_MODULE_TEST__,w=[{id:"s1",projectSlug:"midnite",projectDisplay:"midnite",title:"Wire up the scheduler tick metric",subtitle:"feature/scheduler-metric",status:"running",lastActivity:1718e9,contextTokens:42e3,contextLimit:2e5},{id:"s2",projectSlug:"midnite",projectDisplay:"midnite",title:"Review the repo registry migration",subtitle:"feature/repo-registry",status:"waiting",lastActivity:17179e8},{id:"s3",projectSlug:"docs",projectDisplay:"docs-app",title:"Draft the Phase 26 plan",subtitle:"docs/phase-26",status:"completed",lastActivity:17178e8}],se={title:"Widgets/SessionsWidget",component:I,decorators:[e=>t.jsx("div",{className:"h-80 w-80",children:t.jsx(e,{})})]},n={beforeEach:()=>j([{match:"/sessions",json:w}]),play:async({canvasElement:e})=>{const s=T(e);await r(await s.findByText(w[0].title)).toBeInTheDocument(),await r(s.getByText(w[1].title)).toBeInTheDocument()}},o={beforeEach:()=>j([{match:"/sessions",json:[]}]),play:async({canvasElement:e})=>{const s=T(e);await r(await s.findByText("No active sessions.")).toBeInTheDocument()}},i={beforeEach:()=>j([{match:"/sessions",status:500}]),play:async({canvasElement:e})=>{const s=T(e);await r(await s.findByText("Couldn’t load sessions.")).toBeInTheDocument()}};n.parameters={...n.parameters,docs:{...(c=n.parameters)===null||c===void 0?void 0:c.docs,source:{originalSource:`{
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
}`,...(v=o.parameters)===null||v===void 0||(h=v.docs)===null||h===void 0?void 0:h.source},description:{story:"No active sessions → the empty-state message.",...(y=o.parameters)===null||y===void 0||(x=y.docs)===null||x===void 0?void 0:x.description}}};i.parameters={...i.parameters,docs:{...(f=i.parameters)===null||f===void 0?void 0:f.docs,source:{originalSource:`{
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
}`,...(g=i.parameters)===null||g===void 0||(_=g.docs)===null||_===void 0?void 0:_.source},description:{story:"Gateway sessions endpoint fails → the error fallback.",...(S=i.parameters)===null||S===void 0||(E=S.docs)===null||E===void 0?void 0:E.description}}};const ae=["Default","Empty","Error"];export{n as Default,o as Empty,i as Error,ae as __namedExportsOrder,se as default};
