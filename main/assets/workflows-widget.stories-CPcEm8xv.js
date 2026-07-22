import{aL as R,aX as t,aJ as B,b7 as F,aS as L,aF as M}from"./iframe-B0E9638w.js";import{i as D}from"./mock-fetch-aFrr3kfG.js";import{l as P}from"./index--b0-mZqu.js";import{a3 as G}from"./api-PQjXbBA6.js";import{u as K}from"./use-polling-Cc4M8XNZ.js";import{M as q,W as Z}from"./webhook-CYDUxD9M.js";import{D as $}from"./database-BJ1oeIIW.js";import{P as U}from"./pencil-CmbZLT0d.js";import{G as X}from"./git-merge-B7auwDs-.js";import{B as z}from"./bot-CYXprvai.js";import{S as H}from"./sparkles-j1TVJfas.js";import{G as C}from"./globe-Cpcl8sS0.js";import{C as J}from"./clock-DsVcp4kZ.js";import{P as V}from"./play-C7CxALHo.js";import{W as Y}from"./spinner-uALqxZmY.js";import{W as Q}from"./widget-card-CLzjlASV.js";import{W as ee}from"./workflow-GpwGJ106.js";import{R as te}from"./refresh-cw-Bbg93rs6.js";import{C as ae}from"./check-H-Y7sFPy.js";import"./preload-helper-Dp1pzeXC.js";import"./useQuery-CGzpCi_Y.js";/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oe=[["path",{d:"M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z",key:"sc7q7i"}]],se=R("funnel",oe);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ne=[["path",{d:"M15 6a9 9 0 0 0-9 9V3",key:"1cii5b"}],["circle",{cx:"18",cy:"6",r:"3",key:"1h7g24"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}]],re=R("git-branch",ne),le={play:V,clock:J,webhook:Z,globe:C,sparkles:H,bot:z,"git-branch":re,"git-merge":X,pencil:U,filter:se,database:$,cursor:q};function ie(e){return e&&le[e]||C}const ce=3e4,de=6,me={queued:"bg-muted text-muted-foreground",running:"bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",succeeded:"bg-sky-500/15 text-sky-600 dark:text-sky-400",failed:"bg-destructive/15 text-destructive",canceled:"bg-muted text-muted-foreground"},ue={succeeded:ae,failed:M};function O(){const{data:e,error:a,loading:r,refresh:l}=K(()=>G(),ce),i=(e??[]).filter(o=>!o.archived).sort((o,s)=>new Date(s.updatedAt).getTime()-new Date(o.updatedAt).getTime());return t.jsx(Q,{title:"Workflows",icon:ee,actions:t.jsx("button",{type:"button",onClick:l,"aria-label":"Refresh workflows",className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:t.jsx(te,{className:B("h-3 w-3",r&&"animate-spin")})}),bodyClassName:"overflow-auto",children:a&&!e?t.jsx("p",{className:"px-4 py-6 text-center text-sm text-destructive",children:"Couldn’t load workflows."}):!e&&r?t.jsx(Y,{}):i.length===0?t.jsx("p",{className:"px-4 py-6 text-center text-sm text-muted-foreground",children:"No workflows yet."}):t.jsx("ul",{className:"divide-y divide-border/30",children:i.map(o=>t.jsx(pe,{workflow:o},o.id))})})}function pe({workflow:e}){var a;const r=(a=e.steps)!==null&&a!==void 0?a:[],l=r.slice(0,de),i=r.length-l.length,o=[e.lastRunAt?F(e.lastRunAt):null].filter(Boolean).join(" · ");return t.jsx("li",{children:t.jsxs(P,{href:`/workflows/edit?id=${e.id}`,className:"flex items-center gap-2 px-4 py-2 transition-colors hover:bg-accent",children:[t.jsx("span",{"aria-hidden":!0,className:B("h-2 w-2 shrink-0 rounded-full",e.enabled?"bg-emerald-500":"bg-muted-foreground/40"),title:e.enabled?"Enabled":"Disabled"}),t.jsxs("div",{className:"min-w-0 flex-1",children:[t.jsx("span",{className:"block truncate text-sm font-medium",children:e.name}),l.length>0?t.jsxs("span",{className:"mt-1 flex items-center gap-1.5",children:[t.jsxs("span",{className:"flex items-center gap-1 text-muted-foreground",children:[l.map((s,I)=>{const n=L(s.type),A=ie(n==null?void 0:n.icon);return t.jsx("span",{title:s.label||(n==null?void 0:n.title)||s.type,className:"inline-flex",children:t.jsx(A,{className:"h-3 w-3","aria-hidden":!0})},I)}),i>0&&t.jsxs("span",{className:"text-[10px] tabular-nums",children:["+",i]})]}),o&&t.jsx("span",{className:"truncate text-[11px] text-muted-foreground",children:o})]}):t.jsx("span",{className:"block truncate text-[11px] text-muted-foreground",children:o||`${e.nodeCount} ${e.nodeCount===1?"node":"nodes"}`})]}),e.lastRunStatus&&(()=>{const s=ue[e.lastRunStatus];return t.jsx("span",{className:B("inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",me[e.lastRunStatus]),children:s?t.jsx(s,{className:"h-3 w-3","aria-label":e.lastRunStatus}):e.lastRunStatus})})()]})})}O.__docgenInfo={description:"",methods:[],displayName:"WorkflowsWidget"};var f,h,x,w,v,y,g,_,k,b,E,T,N,j,W;const{expect:u,within:S}=__STORYBOOK_MODULE_TEST__,p=[{id:"wf1",name:"Nightly repo digest",enabled:!0,triggerType:"manual",nodeCount:2,steps:[{type:"http.request",label:"Fetch issues"},{type:"ai.claude",label:"Summarise"}],lastRunStatus:"succeeded",createdAt:"2026-06-01T09:00:00.000Z",updatedAt:"2026-06-21T09:00:00.000Z"},{id:"wf2",name:"PR triage bot",enabled:!1,triggerType:"webhook",nodeCount:0,steps:[],createdAt:"2026-06-02T09:00:00.000Z",updatedAt:"2026-06-20T09:00:00.000Z"}],Ie={title:"Widgets/WorkflowsWidget",component:O,decorators:[e=>t.jsx("div",{className:"h-80 w-80",children:t.jsx(e,{})})]},c={beforeEach:()=>D([{match:"/workflows",json:{items:p,total:p.length}}]),play:async({canvasElement:e})=>{const a=S(e);await u(await a.findByText(p[0].name)).toBeInTheDocument(),await u(a.getByText(p[1].name)).toBeInTheDocument(),await u(a.getByLabelText("succeeded")).toBeInTheDocument()}},d={beforeEach:()=>D([{match:"/workflows",json:{items:[],total:0}}]),play:async({canvasElement:e})=>{const a=S(e);await u(await a.findByText("No workflows yet.")).toBeInTheDocument()}},m={beforeEach:()=>D([{match:"/workflows",status:500}]),play:async({canvasElement:e})=>{const a=S(e);await u(await a.findByText("Couldn’t load workflows.")).toBeInTheDocument()}};c.parameters={...c.parameters,docs:{...(f=c.parameters)===null||f===void 0?void 0:f.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/workflows',
    json: {
      items: WORKFLOWS,
      total: WORKFLOWS.length
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(WORKFLOWS[0]!.name)).toBeInTheDocument();
    await expect(canvas.getByText(WORKFLOWS[1]!.name)).toBeInTheDocument();
    // The last-run badge collapses succeeded/failed to a glyph (labelled by status).
    await expect(canvas.getByLabelText('succeeded')).toBeInTheDocument();
  }
}`,...(x=c.parameters)===null||x===void 0||(h=x.docs)===null||h===void 0?void 0:h.source},description:{story:"Active workflows loaded from the gateway, newest first.",...(v=c.parameters)===null||v===void 0||(w=v.docs)===null||w===void 0?void 0:w.description}}};d.parameters={...d.parameters,docs:{...(y=d.parameters)===null||y===void 0?void 0:y.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/workflows',
    json: {
      items: [],
      total: 0
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('No workflows yet.')).toBeInTheDocument();
  }
}`,...(_=d.parameters)===null||_===void 0||(g=_.docs)===null||g===void 0?void 0:g.source},description:{story:"No workflows yet → the empty-state message.",...(b=d.parameters)===null||b===void 0||(k=b.docs)===null||k===void 0?void 0:k.description}}};m.parameters={...m.parameters,docs:{...(E=m.parameters)===null||E===void 0?void 0:E.docs,source:{originalSource:`{
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
}`,...(N=m.parameters)===null||N===void 0||(T=N.docs)===null||T===void 0?void 0:T.source},description:{story:"Gateway workflows endpoint fails → the error fallback.",...(W=m.parameters)===null||W===void 0||(j=W.docs)===null||j===void 0?void 0:j.description}}};const Ae=["Default","Empty","Error"];export{c as Default,d as Empty,m as Error,Ae as __namedExportsOrder,Ie as default};
