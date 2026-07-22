import{aX as a,aJ as R,b7 as C}from"./iframe-M5pB75MI.js";import{i as k}from"./mock-fetch-aFrr3kfG.js";import{Y as P}from"./api-COvOl9gx.js";import{P as I,G as W}from"./pr-status-chip-DtkCdmwb.js";import{u as M}from"./use-polling-DyXbnWQv.js";import{W as K}from"./spinner-9hpyhM-C.js";import{W as O}from"./widget-card-C95_ujy1.js";import{R as U}from"./rocket-Bp0SLuN2.js";import{R as F}from"./refresh-cw-BWJxGOo-.js";import{E as G}from"./external-link-tiHRimbY.js";import"./preload-helper-Dp1pzeXC.js";import"./git-merge-F7ZjMqot.js";import"./useQuery-DecT-ojR.js";const L=3e4,Z=8;function B(t){var e,s;return(s=(e=t.updatedAt)!==null&&e!==void 0?e:t.createdAt)!==null&&s!==void 0?s:""}function N(){const{data:t,error:e,loading:s,refresh:A}=M(()=>P(),L),b=(t??[]).filter(r=>r.status==="done"&&!r.archivedAt).sort((r,D)=>B(D).localeCompare(B(r))).slice(0,Z);return a.jsx(O,{title:"Shipped",icon:U,actions:a.jsx("button",{type:"button",onClick:A,"aria-label":"Refresh shipped work",className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:a.jsx(F,{className:R("h-3 w-3",s&&"animate-spin")})}),bodyClassName:"overflow-auto",children:e&&!t?a.jsx("p",{className:"px-4 py-6 text-center text-sm text-destructive",children:"Couldn’t load shipped work."}):!t&&s?a.jsx(K,{}):b.length===0?a.jsx("p",{className:"px-4 py-6 text-center text-sm text-muted-foreground",children:"Nothing shipped yet."}):a.jsx("ul",{className:"divide-y divide-border/30",children:b.map(r=>a.jsx($,{task:r},r.id))})})}function $({task:t}){var e;const s=(e=t.updatedAt)!==null&&e!==void 0?e:t.createdAt;return a.jsxs("li",{className:"px-4 py-2",children:[a.jsxs("div",{className:"flex items-center gap-2",children:[a.jsx("span",{className:"min-w-0 flex-1 truncate text-sm font-medium",children:t.title}),s&&a.jsx("span",{className:"shrink-0 text-[11px] tabular-nums text-muted-foreground",children:C(s)})]}),t.prUrl?a.jsxs("div",{className:"mt-0.5 flex items-center gap-1.5",children:[t.prStatus?a.jsx(I,{status:t.prStatus}):a.jsx(W,{className:"h-3 w-3 shrink-0 text-muted-foreground"}),a.jsxs("a",{href:t.prUrl,target:"_blank",rel:"noreferrer noopener",className:"inline-flex min-w-0 items-center gap-1 text-[11px] text-primary hover:underline",title:t.prUrl,children:[a.jsx("span",{className:"truncate",children:H(t.prUrl)}),a.jsx(G,{className:"h-2.5 w-2.5 shrink-0 opacity-60"})]})]}):a.jsx("span",{className:"mt-0.5 block text-[11px] text-muted-foreground",children:"no PR linked"})]})}function H(t){const e=t.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);return e?`${e[1]}/${e[2]}#${e[3]}`:t.replace(/^https?:\/\//,"")}N.__docgenInfo={description:"",methods:[],displayName:"ShippedWidget"};var c,l,p,m,u,h,x,v,f,y,_,g,w,T,E;const{expect:d,within:j}=__STORYBOOK_MODULE_TEST__,S=[{id:"t1",title:"Wire up the scheduler tick metric",status:"done",priority:1,retryCount:0,fixAttempts:0,tags:[],prUrl:"https://github.com/midnite/midnite/pull/45",createdAt:"2026-06-20T08:00:00.000Z",updatedAt:"2026-06-21T09:00:00.000Z",events:[]},{id:"t2",title:"Ship the repo registry migration",status:"done",priority:2,retryCount:0,fixAttempts:0,tags:[],createdAt:"2026-06-19T08:00:00.000Z",updatedAt:"2026-06-20T09:00:00.000Z",events:[]},{id:"t3",title:"Draft the Phase 26 plan",status:"wip",priority:1,retryCount:0,fixAttempts:0,tags:[],events:[]}],ot={title:"Widgets/ShippedWidget",component:N,decorators:[t=>a.jsx("div",{className:"h-80 w-80",children:a.jsx(t,{})})]},n={beforeEach:()=>k([{match:"/tasks",json:{items:S,total:S.length}}]),play:async({canvasElement:t})=>{const e=j(t);await d(await e.findByText(S[0].title)).toBeInTheDocument(),await d(e.getByText("midnite/midnite#45")).toBeInTheDocument(),await d(e.getByText("no PR linked")).toBeInTheDocument()}},o={beforeEach:()=>k([{match:"/tasks",json:{items:[{id:"t0",title:"Still in progress",status:"wip",priority:1,retryCount:0,tags:[]}],total:1}}]),play:async({canvasElement:t})=>{const e=j(t);await d(await e.findByText("Nothing shipped yet.")).toBeInTheDocument()}},i={beforeEach:()=>k([{match:"/tasks",status:500}]),play:async({canvasElement:t})=>{const e=j(t);await d(await e.findByText("Couldn’t load shipped work.")).toBeInTheDocument()}};n.parameters={...n.parameters,docs:{...(c=n.parameters)===null||c===void 0?void 0:c.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/tasks',
    json: {
      items: TASKS,
      total: TASKS.length
    }
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
    json: {
      items: [{
        id: 't0',
        title: 'Still in progress',
        status: 'wip',
        priority: 1,
        retryCount: 0,
        tags: []
      }],
      total: 1
    }
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
}`,...(w=i.parameters)===null||w===void 0||(g=w.docs)===null||g===void 0?void 0:g.source},description:{story:"Gateway tasks endpoint fails → the error fallback.",...(E=i.parameters)===null||E===void 0||(T=E.docs)===null||T===void 0?void 0:T.description}}};const it=["Default","Empty","Error"];export{n as Default,o as Empty,i as Error,it as __namedExportsOrder,ot as default};
