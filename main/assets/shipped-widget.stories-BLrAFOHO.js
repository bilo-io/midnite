import{n as a,f as R,s as C}from"./iframe-CQd7E9rJ.js";import{i as k}from"./mock-fetch-aFrr3kfG.js";import{D as P}from"./api-e81uAW5a.js";import{P as I,G as W}from"./pr-status-chip-CeT_XKfZ.js";import{u as M}from"./use-polling-BBZU1bl5.js";import{W as O}from"./spinner-C6n1qhY-.js";import{W as U}from"./widget-card-D4dC1UWY.js";import{R as F}from"./rocket-4ZUt1Pnf.js";import{R as K}from"./refresh-cw-akydvQKr.js";import{E as G}from"./external-link-C32O_0Ue.js";import"./preload-helper-Dp1pzeXC.js";import"./inbound-srGy8HMv.js";import"./git-merge-IE-nMZmW.js";import"./useQuery-BbZS3zRu.js";const L=3e4,Z=8;function b(e){var t,s;return(s=(t=e.updatedAt)!==null&&t!==void 0?t:e.createdAt)!==null&&s!==void 0?s:""}function B(){const{data:e,error:t,loading:s,refresh:N}=M(()=>P(),L),S=(e??[]).filter(r=>r.status==="done"&&!r.archivedAt).sort((r,D)=>b(D).localeCompare(b(r))).slice(0,Z);return a.jsx(U,{title:"Shipped",icon:F,actions:a.jsx("button",{type:"button",onClick:N,"aria-label":"Refresh shipped work",className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:a.jsx(K,{className:R("h-3 w-3",s&&"animate-spin")})}),bodyClassName:"overflow-auto",children:t&&!e?a.jsx("p",{className:"px-4 py-6 text-center text-sm text-destructive",children:"Couldn’t load shipped work."}):!e&&s?a.jsx(O,{}):S.length===0?a.jsx("p",{className:"px-4 py-6 text-center text-sm text-muted-foreground",children:"Nothing shipped yet."}):a.jsx("ul",{className:"divide-y divide-border/30",children:S.map(r=>a.jsx($,{task:r},r.id))})})}function $({task:e}){var t;const s=(t=e.updatedAt)!==null&&t!==void 0?t:e.createdAt;return a.jsxs("li",{className:"px-4 py-2",children:[a.jsxs("div",{className:"flex items-center gap-2",children:[a.jsx("span",{className:"min-w-0 flex-1 truncate text-sm font-medium",children:e.title}),s&&a.jsx("span",{className:"shrink-0 text-[11px] tabular-nums text-muted-foreground",children:C(s)})]}),e.prUrl?a.jsxs("div",{className:"mt-0.5 flex items-center gap-1.5",children:[e.prStatus?a.jsx(I,{status:e.prStatus}):a.jsx(W,{className:"h-3 w-3 shrink-0 text-muted-foreground"}),a.jsxs("a",{href:e.prUrl,target:"_blank",rel:"noreferrer noopener",className:"inline-flex min-w-0 items-center gap-1 text-[11px] text-primary hover:underline",title:e.prUrl,children:[a.jsx("span",{className:"truncate",children:H(e.prUrl)}),a.jsx(G,{className:"h-2.5 w-2.5 shrink-0 opacity-60"})]})]}):a.jsx("span",{className:"mt-0.5 block text-[11px] text-muted-foreground",children:"no PR linked"})]})}function H(e){const t=e.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);return t?`${t[1]}/${t[2]}#${t[3]}`:e.replace(/^https?:\/\//,"")}B.__docgenInfo={description:"",methods:[],displayName:"ShippedWidget"};var c,l,p,m,u,h,x,v,f,y,_,g,w,T,E;const{expect:d,within:j}=__STORYBOOK_MODULE_TEST__,A=[{id:"t1",title:"Wire up the scheduler tick metric",status:"done",priority:1,retryCount:0,fixAttempts:0,tags:[],prUrl:"https://github.com/midnite/midnite/pull/45",createdAt:"2026-06-20T08:00:00.000Z",updatedAt:"2026-06-21T09:00:00.000Z",events:[]},{id:"t2",title:"Ship the repo registry migration",status:"done",priority:2,retryCount:0,fixAttempts:0,tags:[],createdAt:"2026-06-19T08:00:00.000Z",updatedAt:"2026-06-20T09:00:00.000Z",events:[]},{id:"t3",title:"Draft the Phase 26 plan",status:"wip",priority:1,retryCount:0,fixAttempts:0,tags:[],events:[]}],ie={title:"Widgets/ShippedWidget",component:B,decorators:[e=>a.jsx("div",{className:"h-80 w-80",children:a.jsx(e,{})})]},n={beforeEach:()=>k([{match:"/tasks",json:A}]),play:async({canvasElement:e})=>{const t=j(e);await d(await t.findByText(A[0].title)).toBeInTheDocument(),await d(t.getByText("midnite/midnite#45")).toBeInTheDocument(),await d(t.getByText("no PR linked")).toBeInTheDocument()}},o={beforeEach:()=>k([{match:"/tasks",json:[{id:"t0",title:"Still in progress",status:"wip",priority:1,retryCount:0,fixAttempts:0,tags:[],events:[]}]}]),play:async({canvasElement:e})=>{const t=j(e);await d(await t.findByText("Nothing shipped yet.")).toBeInTheDocument()}},i={beforeEach:()=>k([{match:"/tasks",status:500}]),play:async({canvasElement:e})=>{const t=j(e);await d(await t.findByText("Couldn’t load shipped work.")).toBeInTheDocument()}};n.parameters={...n.parameters,docs:{...(c=n.parameters)===null||c===void 0?void 0:c.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/tasks',
    json: TASKS
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(TASKS[0]!.title)).toBeInTheDocument();
    // The GitHub PR url collapses to an "owner/repo#number" label.
    await expect(canvas.getByText('midnite/midnite#45')).toBeInTheDocument();
    // A done task with no PR shows the "no PR linked" note.
    await expect(canvas.getByText('no PR linked')).toBeInTheDocument();
  }
}`,...(p=n.parameters)===null||p===void 0||(l=p.docs)===null||l===void 0?void 0:l.source},description:{story:"Completed work loaded from the gateway, newest first, with PR labels.",...(u=n.parameters)===null||u===void 0||(m=u.docs)===null||m===void 0?void 0:m.description}}};o.parameters={...o.parameters,docs:{...(h=o.parameters)===null||h===void 0?void 0:h.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/tasks',
    json: [{
      id: 't0',
      title: 'Still in progress',
      status: 'wip',
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
    await expect(await canvas.findByText('Nothing shipped yet.')).toBeInTheDocument();
  }
}`,...(v=o.parameters)===null||v===void 0||(x=v.docs)===null||x===void 0?void 0:x.source},description:{story:"Tasks exist but none are shipped → the empty-state message.",...(y=o.parameters)===null||y===void 0||(f=y.docs)===null||f===void 0?void 0:f.description}}};i.parameters={...i.parameters,docs:{...(_=i.parameters)===null||_===void 0?void 0:_.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/tasks',
    status: 500
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Couldn’t load shipped work.')).toBeInTheDocument();
  }
}`,...(w=i.parameters)===null||w===void 0||(g=w.docs)===null||g===void 0?void 0:g.source},description:{story:"Gateway tasks endpoint fails → the error fallback.",...(E=i.parameters)===null||E===void 0||(T=E.docs)===null||T===void 0?void 0:T.description}}};const de=["Default","Empty","Error"];export{n as Default,o as Empty,i as Error,de as __namedExportsOrder,ie as default};
