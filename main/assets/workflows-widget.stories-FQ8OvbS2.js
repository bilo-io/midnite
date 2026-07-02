import{h as R,n as t,f as W,s as F}from"./iframe-CHRwHqqi.js";import{i as D}from"./mock-fetch-aFrr3kfG.js";import{l as M}from"./index-DkWdQ34z.js";import{Z as G}from"./inbound-B2u08JBq.js";import{G as L}from"./api-BFzohKx1.js";import{u as P}from"./use-polling-D-JbNGp3.js";import{M as K,W as Z}from"./webhook-B1hahiBn.js";import{D as q}from"./database-BCoiXhdF.js";import{P as $}from"./pencil-DAuCl7j1.js";import{G as z}from"./git-merge-CiigUM6Y.js";import{B as H}from"./bot-CRdNzDgA.js";import{S as U}from"./sparkles-D4N2inJQ.js";import{G as C}from"./globe-BQ2aMcfG.js";import{C as V}from"./clock-BFxfH8mo.js";import{P as X}from"./play-DGdwgeQy.js";import{W as Y}from"./spinner-D6yGCp13.js";import{W as J}from"./widget-card-RnaIJzPB.js";import{W as Q}from"./workflow-D-5fesM5.js";import{R as ee}from"./refresh-cw-DoU8Sb4u.js";import"./preload-helper-Dp1pzeXC.js";import"./useQuery-ldNr4gdm.js";/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const te=[["path",{d:"M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z",key:"sc7q7i"}]],ae=R("funnel",te);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oe=[["path",{d:"M15 6a9 9 0 0 0-9 9V3",key:"1cii5b"}],["circle",{cx:"18",cy:"6",r:"3",key:"1h7g24"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}]],se=R("git-branch",oe),re={play:X,clock:V,webhook:Z,globe:C,sparkles:U,bot:H,"git-branch":se,"git-merge":z,pencil:$,filter:ae,database:q,cursor:K};function ne(e){return e&&re[e]||C}const ce=3e4,ie=6,le={queued:"bg-muted text-muted-foreground",running:"bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",succeeded:"bg-sky-500/15 text-sky-600 dark:text-sky-400",failed:"bg-destructive/15 text-destructive",canceled:"bg-muted text-muted-foreground"};function A(){const{data:e,error:a,loading:r,refresh:n}=P(()=>L(),ce),c=(e??[]).filter(o=>!o.archived).sort((o,i)=>new Date(i.updatedAt).getTime()-new Date(o.updatedAt).getTime());return t.jsx(J,{title:"Workflows",icon:Q,actions:t.jsx("button",{type:"button",onClick:n,"aria-label":"Refresh workflows",className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:t.jsx(ee,{className:W("h-3 w-3",r&&"animate-spin")})}),bodyClassName:"overflow-auto",children:a&&!e?t.jsx("p",{className:"px-4 py-6 text-center text-sm text-destructive",children:"Couldn’t load workflows."}):!e&&r?t.jsx(Y,{}):c.length===0?t.jsx("p",{className:"px-4 py-6 text-center text-sm text-muted-foreground",children:"No workflows yet."}):t.jsx("ul",{className:"divide-y divide-border/30",children:c.map(o=>t.jsx(de,{workflow:o},o.id))})})}function de({workflow:e}){var a;const r=(a=e.steps)!==null&&a!==void 0?a:[],n=r.slice(0,ie),c=r.length-n.length,o=[e.cron,e.lastRunAt?F(e.lastRunAt):null].filter(Boolean).join(" · ");return t.jsx("li",{children:t.jsxs(M,{href:`/workflows/edit?id=${e.id}`,className:"flex items-center gap-2 px-4 py-2 transition-colors hover:bg-accent",children:[t.jsx("span",{"aria-hidden":!0,className:W("h-2 w-2 shrink-0 rounded-full",e.enabled?"bg-emerald-500":"bg-muted-foreground/40"),title:e.enabled?"Enabled":"Disabled"}),t.jsxs("div",{className:"min-w-0 flex-1",children:[t.jsx("span",{className:"block truncate text-sm font-medium",children:e.name}),n.length>0?t.jsxs("span",{className:"mt-1 flex items-center gap-1.5",children:[t.jsxs("span",{className:"flex items-center gap-1 text-muted-foreground",children:[n.map((i,I)=>{const s=G(i.type),O=ne(s==null?void 0:s.icon);return t.jsx("span",{title:i.label||(s==null?void 0:s.title)||i.type,className:"inline-flex",children:t.jsx(O,{className:"h-3 w-3","aria-hidden":!0})},I)}),c>0&&t.jsxs("span",{className:"text-[10px] tabular-nums",children:["+",c]})]}),o&&t.jsx("span",{className:"truncate text-[11px] text-muted-foreground",children:o})]}):t.jsx("span",{className:"block truncate text-[11px] text-muted-foreground",children:o||`${e.nodeCount} ${e.nodeCount===1?"node":"nodes"}`})]}),e.lastRunStatus&&t.jsx("span",{className:W("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",le[e.lastRunStatus]),children:e.lastRunStatus})]})})}A.__docgenInfo={description:"",methods:[],displayName:"WorkflowsWidget"};var p,f,h,x,w,v,y,g,_,k,b,E,T,N,j;const{expect:u,within:S}=__STORYBOOK_MODULE_TEST__,B=[{id:"wf1",name:"Nightly repo digest",enabled:!0,triggerType:"schedule",cron:"0 9 * * *",nodeCount:2,steps:[{type:"http.request",label:"Fetch issues"},{type:"ai.claude",label:"Summarise"}],lastRunStatus:"succeeded",createdAt:"2026-06-01T09:00:00.000Z",updatedAt:"2026-06-21T09:00:00.000Z"},{id:"wf2",name:"PR triage bot",enabled:!1,triggerType:"webhook",nodeCount:0,steps:[],createdAt:"2026-06-02T09:00:00.000Z",updatedAt:"2026-06-20T09:00:00.000Z"}],Re={title:"Widgets/WorkflowsWidget",component:A,decorators:[e=>t.jsx("div",{className:"h-80 w-80",children:t.jsx(e,{})})]},l={beforeEach:()=>D([{match:"/workflows",json:B}]),play:async({canvasElement:e})=>{const a=S(e);await u(await a.findByText(B[0].name)).toBeInTheDocument(),await u(a.getByText(B[1].name)).toBeInTheDocument(),await u(a.getByText("succeeded")).toBeInTheDocument()}},d={beforeEach:()=>D([{match:"/workflows",json:[]}]),play:async({canvasElement:e})=>{const a=S(e);await u(await a.findByText("No workflows yet.")).toBeInTheDocument()}},m={beforeEach:()=>D([{match:"/workflows",status:500}]),play:async({canvasElement:e})=>{const a=S(e);await u(await a.findByText("Couldn’t load workflows.")).toBeInTheDocument()}};l.parameters={...l.parameters,docs:{...(p=l.parameters)===null||p===void 0?void 0:p.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/workflows',
    json: WORKFLOWS
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(WORKFLOWS[0]!.name)).toBeInTheDocument();
    await expect(canvas.getByText(WORKFLOWS[1]!.name)).toBeInTheDocument();
    // The last-run badge renders capitalized from the run status.
    await expect(canvas.getByText('succeeded')).toBeInTheDocument();
  }
}`,...(h=l.parameters)===null||h===void 0||(f=h.docs)===null||f===void 0?void 0:f.source},description:{story:"Active workflows loaded from the gateway, newest first.",...(w=l.parameters)===null||w===void 0||(x=w.docs)===null||x===void 0?void 0:x.description}}};d.parameters={...d.parameters,docs:{...(v=d.parameters)===null||v===void 0?void 0:v.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/workflows',
    json: []
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('No workflows yet.')).toBeInTheDocument();
  }
}`,...(g=d.parameters)===null||g===void 0||(y=g.docs)===null||y===void 0?void 0:y.source},description:{story:"No workflows yet → the empty-state message.",...(k=d.parameters)===null||k===void 0||(_=k.docs)===null||_===void 0?void 0:_.description}}};m.parameters={...m.parameters,docs:{...(b=m.parameters)===null||b===void 0?void 0:b.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/workflows',
    status: 500
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Couldn’t load workflows.')).toBeInTheDocument();
  }
}`,...(T=m.parameters)===null||T===void 0||(E=T.docs)===null||E===void 0?void 0:E.source},description:{story:"Gateway workflows endpoint fails → the error fallback.",...(j=m.parameters)===null||j===void 0||(N=j.docs)===null||N===void 0?void 0:N.description}}};const Ce=["Default","Empty","Error"];export{l as Default,d as Empty,m as Error,Ce as __namedExportsOrder,Re as default};
