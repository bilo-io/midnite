import{aN as A,b1 as L,ba as K,a_ as s,aL as C,bc as P,aV as G,aF as q}from"./iframe-CzW4mhwb.js";import{i as O}from"./mock-fetch-aFrr3kfG.js";import{l as Z}from"./index-CKsTKQJa.js";import{a6 as H}from"./api-D5zsh0uM.js";import{u as U}from"./use-polling-COtYyagt.js";import{M as V,W as X}from"./webhook-D1mG1mZj.js";import{D as z}from"./database-BrSvq5oh.js";import{P as Y}from"./pencil-D1Dyjxjd.js";import{G as J}from"./git-merge-Ca-SUyDh.js";import{B as Q}from"./bot-CjilspNc.js";import{S as ee}from"./sparkles-BZKOPIPL.js";import{G as $}from"./globe-Bfh7y07u.js";import{C as te}from"./clock-aG7GHARr.js";import{P as ae}from"./play-BcL9fGhQ.js";import{W as oe}from"./spinner-C37ILLly.js";import{W as se}from"./widget-card-C7BUS7ZY.js";import{W as ne}from"./workflow-DNXBj_j0.js";import{R as re}from"./refresh-cw-F_jABSKx.js";import{C as le}from"./check-C_AEmsFb.js";import"./preload-helper-Dp1pzeXC.js";import"./useQuery-B_xDZICD.js";/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ie=[["path",{d:"M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z",key:"sc7q7i"}]],ce=A("funnel",ie);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const de=[["path",{d:"M15 6a9 9 0 0 0-9 9V3",key:"1cii5b"}],["circle",{cx:"18",cy:"6",r:"3",key:"1h7g24"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}]],me=A("git-branch",de),pe={play:ae,clock:te,webhook:X,globe:$,sparkles:ee,bot:Q,"git-branch":me,"git-merge":J,pencil:Y,filter:ce,database:z,cursor:V};function ue(e){return e&&pe[e]||$}function x(e){return e===""?"_empty":e.replaceAll(".","_")}function fe(){const e=L("workflows");return K.useMemo(()=>{const o=(t,a)=>e.has(t)?e(t):a,l=t=>`nodes.${x(t.id)}`,r=(t,a)=>`${l(t)}.fields.${x(a.key)}`;return{title:t=>o(`${l(t)}.title`,t.title),description:t=>o(`${l(t)}.description`,t.description),fieldLabel:(t,a)=>o(`${r(t,a)}.label`,a.label),fieldPlaceholder:(t,a)=>a.placeholder===void 0?void 0:o(`${r(t,a)}.placeholder`,a.placeholder),fieldHelp:(t,a)=>a.help===void 0?void 0:o(`${r(t,a)}.help`,a.help),optionLabel:(t,a,n)=>o(`${r(t,a)}.options.${x(n.value)}`,n.label),portLabel:(t,a)=>a.label===void 0?void 0:o(`${l(t)}.ports.${x(a.name)}`,a.label)}},[e])}const he=3e4,xe=6,we={queued:"bg-muted text-muted-foreground",running:"bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",succeeded:"bg-sky-500/15 text-sky-600 dark:text-sky-400",failed:"bg-destructive/15 text-destructive",canceled:"bg-muted text-muted-foreground"},ve={succeeded:le,failed:q};function F(){const e=L("workflows"),{data:o,error:l,loading:r,refresh:t}=U(()=>H(),he),a=(o??[]).filter(n=>!n.archived).sort((n,c)=>new Date(c.updatedAt).getTime()-new Date(n.updatedAt).getTime());return s.jsx(se,{title:e("list.widget.title"),icon:ne,actions:s.jsx("button",{type:"button",onClick:t,"aria-label":e("list.widget.refresh"),className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:s.jsx(re,{className:C("h-3 w-3",r&&"animate-spin")})}),bodyClassName:"overflow-auto",children:l&&!o?s.jsx("p",{className:"px-4 py-6 text-center text-sm text-destructive",children:e("list.widget.error")}):!o&&r?s.jsx(oe,{}):a.length===0?s.jsx("p",{className:"px-4 py-6 text-center text-sm text-muted-foreground",children:e("list.widget.empty")}):s.jsx("ul",{className:"divide-y divide-border/30",children:a.map(n=>s.jsx(ye,{workflow:n},n.id))})})}function ye({workflow:e}){const o=L("workflows"),l=fe();var r;const t=(r=e.steps)!==null&&r!==void 0?r:[],a=t.slice(0,xe),n=t.length-a.length,c=[e.lastRunAt?P(e.lastRunAt):null].filter(Boolean).join(" · ");return s.jsx("li",{children:s.jsxs(Z,{href:`/workflows/edit?id=${e.id}`,className:"flex items-center gap-2 px-4 py-2 transition-colors hover:bg-accent",children:[s.jsx("span",{"aria-hidden":!0,className:C("h-2 w-2 shrink-0 rounded-full",e.enabled?"bg-emerald-500":"bg-muted-foreground/40"),title:e.enabled?o("list.widget.enabled"):o("list.widget.disabled")}),s.jsxs("div",{className:"min-w-0 flex-1",children:[s.jsx("span",{className:"block truncate text-sm font-medium",children:e.name}),a.length>0?s.jsxs("span",{className:"mt-1 flex items-center gap-1.5",children:[s.jsxs("span",{className:"flex items-center gap-1 text-muted-foreground",children:[a.map((i,h)=>{const d=G(i.type),M=ue(d==null?void 0:d.icon);return s.jsx("span",{title:i.label||(d?l.title(d):i.type),className:"inline-flex",children:s.jsx(M,{className:"h-3 w-3","aria-hidden":!0})},h)}),n>0&&s.jsxs("span",{className:"text-[10px] tabular-nums",children:["+",n]})]}),c&&s.jsx("span",{className:"truncate text-[11px] text-muted-foreground",children:c})]}):s.jsx("span",{className:"block truncate text-[11px] text-muted-foreground",children:c||o("list.nodeCount",{count:e.nodeCount})})]}),e.lastRunStatus&&(()=>{const i=ve[e.lastRunStatus],h=o(`editor.controls.status.${e.lastRunStatus}`);return s.jsx("span",{className:C("inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium",we[e.lastRunStatus]),children:i?s.jsx(i,{className:"h-3 w-3","aria-label":h}):h})})()]})})}F.__docgenInfo={description:"",methods:[],displayName:"WorkflowsWidget"};var v,y,g,b,_,k,E,T,N,j,W,B,S,D,R;const{expect:f,within:I}=__STORYBOOK_MODULE_TEST__,w=[{id:"wf1",name:"Nightly repo digest",enabled:!0,triggerType:"manual",nodeCount:2,steps:[{type:"http.request",label:"Fetch issues"},{type:"ai.claude",label:"Summarise"}],lastRunStatus:"succeeded",createdAt:"2026-06-01T09:00:00.000Z",updatedAt:"2026-06-21T09:00:00.000Z"},{id:"wf2",name:"PR triage bot",enabled:!1,triggerType:"webhook",nodeCount:0,steps:[],createdAt:"2026-06-02T09:00:00.000Z",updatedAt:"2026-06-20T09:00:00.000Z"}],Ke={title:"Widgets/WorkflowsWidget",component:F,decorators:[e=>s.jsx("div",{className:"h-80 w-80",children:s.jsx(e,{})})]},m={beforeEach:()=>O([{match:"/workflows",json:{items:w,total:w.length}}]),play:async({canvasElement:e})=>{const o=I(e);await f(await o.findByText(w[0].name)).toBeInTheDocument(),await f(o.getByText(w[1].name)).toBeInTheDocument(),await f(o.getByLabelText("Succeeded")).toBeInTheDocument()}},p={beforeEach:()=>O([{match:"/workflows",json:{items:[],total:0}}]),play:async({canvasElement:e})=>{const o=I(e);await f(await o.findByText("No workflows yet.")).toBeInTheDocument()}},u={beforeEach:()=>O([{match:"/workflows",status:500}]),play:async({canvasElement:e})=>{const o=I(e);await f(await o.findByText("Couldn’t load workflows.")).toBeInTheDocument()}};m.parameters={...m.parameters,docs:{...(v=m.parameters)===null||v===void 0?void 0:v.docs,source:{originalSource:`{
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
    await expect(canvas.getByLabelText('Succeeded')).toBeInTheDocument();
  }
}`,...(g=m.parameters)===null||g===void 0||(y=g.docs)===null||y===void 0?void 0:y.source},description:{story:"Active workflows loaded from the gateway, newest first.",...(_=m.parameters)===null||_===void 0||(b=_.docs)===null||b===void 0?void 0:b.description}}};p.parameters={...p.parameters,docs:{...(k=p.parameters)===null||k===void 0?void 0:k.docs,source:{originalSource:`{
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
}`,...(T=p.parameters)===null||T===void 0||(E=T.docs)===null||E===void 0?void 0:E.source},description:{story:"No workflows yet → the empty-state message.",...(j=p.parameters)===null||j===void 0||(N=j.docs)===null||N===void 0?void 0:N.description}}};u.parameters={...u.parameters,docs:{...(W=u.parameters)===null||W===void 0?void 0:W.docs,source:{originalSource:`{
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
}`,...(S=u.parameters)===null||S===void 0||(B=S.docs)===null||B===void 0?void 0:B.source},description:{story:"Gateway workflows endpoint fails → the error fallback.",...(R=u.parameters)===null||R===void 0||(D=R.docs)===null||D===void 0?void 0:D.description}}};const Pe=["Default","Empty","Error"];export{m as Default,p as Empty,u as Error,Pe as __namedExportsOrder,Ke as default};
