import{aL as D,aX as a,b7 as A,aJ as W}from"./iframe-B_2RvTEd.js";import{i as j}from"./mock-fetch-aFrr3kfG.js";import{X as C}from"./api-aKWrzv8l.js";import{u as R}from"./use-polling-BROZ8IuK.js";import{W as M}from"./spinner-Ds_uUGCl.js";import{W as S}from"./widget-card-Bhz0LS0E.js";import{R as F}from"./refresh-cw-B4GyznGO.js";import"./preload-helper-Dp1pzeXC.js";import"./useQuery-DmTwmtFT.js";/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const O=[["path",{d:"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",key:"169zse"}]],L=D("activity",O),z=2e4,b=12;function G(t){const e=t.replace(/[._-]+/g," ").trim();return e.charAt(0).toUpperCase()+e.slice(1)}function K(t){const e=[];for(let n=0;n<t.length;n++){const s=t[n],i=new Date(s.at).getTime();Number.isFinite(i)&&e.push({id:`${s.taskId}:${n}`,title:s.title,kind:s.kind,at:i})}return e.sort((n,s)=>s.at-n.at).slice(0,b)}function I(){const{data:t,error:e,loading:n,refresh:s}=R(()=>C(b),z),i=t?K(t):[];return a.jsx(S,{title:"Activity feed",icon:L,actions:a.jsx("button",{type:"button",onClick:s,"aria-label":"Refresh activity",className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:a.jsx(F,{className:W("h-3 w-3",n&&"animate-spin")})}),bodyClassName:"overflow-auto",children:e&&!t?a.jsx("p",{className:"px-4 py-6 text-center text-sm text-destructive",children:"Couldn’t load activity."}):!t&&n?a.jsx(M,{}):i.length===0?a.jsx("p",{className:"px-4 py-6 text-center text-sm text-muted-foreground",children:"No activity yet."}):a.jsx("ul",{className:"divide-y divide-border/30",children:i.map(l=>a.jsxs("li",{className:"flex items-baseline gap-2 px-4 py-2",children:[a.jsxs("span",{className:"min-w-0 flex-1",children:[a.jsx("span",{className:"text-[11px] font-medium uppercase tracking-wide text-muted-foreground",children:G(l.kind)}),a.jsx("span",{className:"block truncate text-sm",children:l.title})]}),a.jsx("span",{className:"shrink-0 text-[11px] tabular-nums text-muted-foreground",children:A(l.at)})]},l.id))})})}I.__docgenInfo={description:"",methods:[],displayName:"ActivityWidget"};var m,p,u,v,h,y,x,_,f,g,k,E,T,w,B;const{expect:d,within:N}=__STORYBOOK_MODULE_TEST__,P=[{taskId:"t1",title:"Wire up the scheduler tick metric",kind:"agent.started",at:"2026-06-21T09:00:00.000Z"},{taskId:"t1",title:"Wire up the scheduler tick metric",kind:"task.created",at:"2026-06-21T08:30:00.000Z"},{taskId:"t2",title:"Review the repo registry migration",kind:"pr.merged",at:"2026-06-21T07:00:00.000Z"}],Q={title:"Widgets/ActivityWidget",component:I,decorators:[t=>a.jsx("div",{className:"h-80 w-80",children:a.jsx(t,{})})]},r={beforeEach:()=>j([{match:"/tasks/activity",json:P}]),play:async({canvasElement:t})=>{const e=N(t);await d(await e.findByText("Agent started")).toBeInTheDocument(),await d(e.getByText("Pr merged")).toBeInTheDocument(),await d(e.getAllByText("Wire up the scheduler tick metric").length).toBeGreaterThan(0)}},o={beforeEach:()=>j([{match:"/tasks/activity",json:[]}]),play:async({canvasElement:t})=>{const e=N(t);await d(await e.findByText("No activity yet.")).toBeInTheDocument()}},c={beforeEach:()=>j([{match:"/tasks/activity",status:500}]),play:async({canvasElement:t})=>{const e=N(t);await d(await e.findByText("Couldn’t load activity.")).toBeInTheDocument()}};r.parameters={...r.parameters,docs:{...(m=r.parameters)===null||m===void 0?void 0:m.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/tasks/activity',
    json: ACTIVITY
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    // Kind is humanized (\`agent.started\` → \`Agent started\`).
    await expect(await canvas.findByText('Agent started')).toBeInTheDocument();
    await expect(canvas.getByText('Pr merged')).toBeInTheDocument();
    await expect(canvas.getAllByText('Wire up the scheduler tick metric').length).toBeGreaterThan(0);
  }
}`,...(u=r.parameters)===null||u===void 0||(p=u.docs)===null||p===void 0?void 0:p.source},description:{story:"Recent events rendered newest-first, kinds humanized.",...(h=r.parameters)===null||h===void 0||(v=h.docs)===null||v===void 0?void 0:v.description}}};o.parameters={...o.parameters,docs:{...(y=o.parameters)===null||y===void 0?void 0:y.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/tasks/activity',
    json: []
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('No activity yet.')).toBeInTheDocument();
  }
}`,...(_=o.parameters)===null||_===void 0||(x=_.docs)===null||x===void 0?void 0:x.source},description:{story:"No recent events → the empty-state message.",...(g=o.parameters)===null||g===void 0||(f=g.docs)===null||f===void 0?void 0:f.description}}};c.parameters={...c.parameters,docs:{...(k=c.parameters)===null||k===void 0?void 0:k.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/tasks/activity',
    status: 500
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Couldn’t load activity.')).toBeInTheDocument();
  }
}`,...(T=c.parameters)===null||T===void 0||(E=T.docs)===null||E===void 0?void 0:E.source},description:{story:"Gateway activity endpoint fails → the error fallback.",...(B=c.parameters)===null||B===void 0||(w=B.docs)===null||w===void 0?void 0:w.description}}};const tt=["Default","Empty","Error"];export{r as Default,o as Empty,c as Error,tt as __namedExportsOrder,Q as default};
