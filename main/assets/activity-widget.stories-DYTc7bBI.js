import{h as N,n as a,s as D,f as C}from"./iframe-C6uDgmxk.js";import{i as j}from"./mock-fetch-aFrr3kfG.js";import{C as S}from"./api-BF5NoeS0.js";import{u as W}from"./use-polling-D74O8IIY.js";import{W as I}from"./spinner-D7jTjtiJ.js";import{W as R}from"./widget-card-B5zkLKsd.js";import{R as M}from"./refresh-cw-Ig30sJgw.js";import"./preload-helper-Dp1pzeXC.js";import"./inbound-C7DsSwT4.js";import"./useQuery-B8KZ_ydZ.js";/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const F=[["path",{d:"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",key:"169zse"}]],O=N("activity",F),K=2e4,L=12;function U(t){const e=t.replace(/[._-]+/g," ").trim();return e.charAt(0).toUpperCase()+e.slice(1)}function z(t){const e=[];for(const s of t)for(let n=0;n<s.events.length;n++){const i=s.events[n],r=new Date(i.at).getTime();Number.isFinite(r)&&e.push({id:`${s.id}:${n}`,title:s.title,kind:i.kind,at:r})}return e.sort((s,n)=>n.at-s.at).slice(0,L)}function b(){const{data:t,error:e,loading:s,refresh:n}=W(()=>S(),K),i=t?z(t):[];return a.jsx(R,{title:"Activity feed",icon:O,actions:a.jsx("button",{type:"button",onClick:n,"aria-label":"Refresh activity",className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:a.jsx(M,{className:C("h-3 w-3",s&&"animate-spin")})}),bodyClassName:"overflow-auto",children:e&&!t?a.jsx("p",{className:"px-4 py-6 text-center text-sm text-destructive",children:"Couldn’t load activity."}):!t&&s?a.jsx(I,{}):i.length===0?a.jsx("p",{className:"px-4 py-6 text-center text-sm text-muted-foreground",children:"No activity yet."}):a.jsx("ul",{className:"divide-y divide-border/30",children:i.map(r=>a.jsxs("li",{className:"flex items-baseline gap-2 px-4 py-2",children:[a.jsxs("span",{className:"min-w-0 flex-1",children:[a.jsx("span",{className:"text-[11px] font-medium uppercase tracking-wide text-muted-foreground",children:U(r.kind)}),a.jsx("span",{className:"block truncate text-sm",children:r.title})]}),a.jsx("span",{className:"shrink-0 text-[11px] tabular-nums text-muted-foreground",children:D(r.at)})]},r.id))})})}b.__docgenInfo={description:"",methods:[],displayName:"ActivityWidget"};var m,p,u,v,h,y,x,f,_,g,k,T,E,w,B;const{expect:l,within:A}=__STORYBOOK_MODULE_TEST__,G=[{id:"t1",title:"Wire up the scheduler tick metric",status:"wip",priority:1,retryCount:0,fixAttempts:0,tags:[],events:[{at:"2026-06-21T09:00:00.000Z",kind:"agent.started"},{at:"2026-06-21T08:30:00.000Z",kind:"task.created"}]},{id:"t2",title:"Review the repo registry migration",status:"done",priority:2,retryCount:0,fixAttempts:0,tags:[],events:[{at:"2026-06-21T07:00:00.000Z",kind:"pr.merged"}]}],tt={title:"Widgets/ActivityWidget",component:b,decorators:[t=>a.jsx("div",{className:"h-80 w-80",children:a.jsx(t,{})})]},o={beforeEach:()=>j([{match:"/tasks",json:G}]),play:async({canvasElement:t})=>{const e=A(t);await l(await e.findByText("Agent started")).toBeInTheDocument(),await l(e.getByText("Pr merged")).toBeInTheDocument(),await l(e.getAllByText("Wire up the scheduler tick metric").length).toBeGreaterThan(0)}},c={beforeEach:()=>j([{match:"/tasks",json:[{id:"t0",title:"Untouched task",status:"todo",priority:1,retryCount:0,fixAttempts:0,tags:[],events:[]}]}]),play:async({canvasElement:t})=>{const e=A(t);await l(await e.findByText("No activity yet.")).toBeInTheDocument()}},d={beforeEach:()=>j([{match:"/tasks",status:500}]),play:async({canvasElement:t})=>{const e=A(t);await l(await e.findByText("Couldn’t load activity.")).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(m=o.parameters)===null||m===void 0?void 0:m.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/tasks',
    json: TASKS
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
}`,...(u=o.parameters)===null||u===void 0||(p=u.docs)===null||p===void 0?void 0:p.source},description:{story:"Task events flattened into a newest-first feed.",...(h=o.parameters)===null||h===void 0||(v=h.docs)===null||v===void 0?void 0:v.description}}};c.parameters={...c.parameters,docs:{...(y=c.parameters)===null||y===void 0?void 0:y.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/tasks',
    json: [{
      id: 't0',
      title: 'Untouched task',
      status: 'todo',
      priority: 1,
      retryCount: 0,
      fixAttempts: 0,
      tags: [],
      events: []
    } satisfies Task]
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('No activity yet.')).toBeInTheDocument();
  }
}`,...(f=c.parameters)===null||f===void 0||(x=f.docs)===null||x===void 0?void 0:x.source},description:{story:"Tasks exist but none have events → the empty-state message.",...(g=c.parameters)===null||g===void 0||(_=g.docs)===null||_===void 0?void 0:_.description}}};d.parameters={...d.parameters,docs:{...(k=d.parameters)===null||k===void 0?void 0:k.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/tasks',
    status: 500
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Couldn’t load activity.')).toBeInTheDocument();
  }
}`,...(E=d.parameters)===null||E===void 0||(T=E.docs)===null||T===void 0?void 0:T.source},description:{story:"Gateway tasks endpoint fails → the error fallback.",...(B=d.parameters)===null||B===void 0||(w=B.docs)===null||w===void 0?void 0:w.description}}};const et=["Default","Empty","Error"];export{o as Default,c as Empty,d as Error,et as __namedExportsOrder,tt as default};
