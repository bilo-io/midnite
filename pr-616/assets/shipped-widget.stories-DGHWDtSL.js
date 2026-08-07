import{b4 as D,b1 as e,aN as I}from"./iframe-CKwTzkft.js";import{i as k}from"./mock-fetch-aFrr3kfG.js";import{a0 as W}from"./api-CcNg5pSP.js";import{P as L,G as M}from"./pr-status-chip-D2rQ4pcJ.js";import{u as K}from"./dashboard-widget-labels-V7gGr7J8.js";import{h as O}from"./i18n-labels-B91XhacH.js";import{u as U}from"./use-polling-TItVNP8p.js";import{W as F}from"./spinner-Dt39C-_O.js";import{W as G}from"./widget-card-DFX7SSg6.js";import{R as Z}from"./rocket-CKZDAh6h.js";import{R as $}from"./refresh-cw-D321k-QE.js";import{E as H}from"./external-link-BE_cJRIJ.js";import"./preload-helper-Dp1pzeXC.js";import"./git-merge-Cfn_H2R1.js";import"./star-DzcVOPr8.js";import"./chart-line-qTUcvpvr.js";import"./layout-grid-l-7il1JP.js";import"./globe-D80kFb9q.js";import"./database-B_6WCnTK.js";import"./newspaper-XYafag-u.js";import"./users-DuyFOZOY.js";import"./folder-git-2-B4UVtXPa.js";import"./bot-BjzVTmY7.js";import"./brain-BP9nailV.js";import"./workflow-DR9G7Pka.js";import"./square-terminal-Cdf-pWpw.js";import"./clock-XegASoNl.js";import"./sticky-note-JHjGSBuy.js";import"./useQuery-CRh6bqSv.js";const q=3e4,X=8;function A(t){var a,r;return(r=(a=t.updatedAt)!==null&&a!==void 0?a:t.createdAt)!==null&&r!==void 0?r:""}function R(){const t=D("dashboard"),a=K(),{data:r,error:o,loading:n,refresh:C}=U(()=>W(),q),N=(r??[]).filter(s=>s.status==="done"&&!s.archivedAt).sort((s,P)=>A(P).localeCompare(A(s))).slice(0,X);return e.jsx(G,{title:a.label("shipped"),icon:Z,actions:e.jsx("button",{type:"button",onClick:C,"aria-label":t("shipped.refresh"),className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:e.jsx($,{className:I("h-3 w-3",n&&"animate-spin")})}),bodyClassName:"overflow-auto",children:o&&!r?e.jsx("p",{className:"px-4 py-6 text-center text-sm text-destructive",children:t("shipped.error")}):!r&&n?e.jsx(F,{}):N.length===0?e.jsx("p",{className:"px-4 py-6 text-center text-sm text-muted-foreground",children:t("shipped.empty")}):e.jsx("ul",{className:"divide-y divide-border/30",children:N.map(s=>e.jsx(Y,{task:s},s.id))})})}function Y({task:t}){const a=D("dashboard"),r=O();var o;const n=(o=t.updatedAt)!==null&&o!==void 0?o:t.createdAt;return e.jsxs("li",{className:"px-4 py-2",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"min-w-0 flex-1 truncate text-sm font-medium",children:t.title}),n&&e.jsx("span",{className:"shrink-0 text-[11px] tabular-nums text-muted-foreground",children:r(n)})]}),t.prUrl?e.jsxs("div",{className:"mt-0.5 flex items-center gap-1.5",children:[t.prStatus?e.jsx(L,{status:t.prStatus}):e.jsx(M,{className:"h-3 w-3 shrink-0 text-muted-foreground"}),e.jsxs("a",{href:t.prUrl,target:"_blank",rel:"noreferrer noopener",className:"inline-flex min-w-0 items-center gap-1 text-[11px] text-primary hover:underline",title:t.prUrl,children:[e.jsx("span",{className:"truncate",children:z(t.prUrl)}),e.jsx(H,{className:"h-2.5 w-2.5 shrink-0 opacity-60"})]})]}):e.jsx("span",{className:"mt-0.5 block text-[11px] text-muted-foreground",children:a("shipped.noPr")})]})}function z(t){const a=t.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);return a?`${a[1]}/${a[2]}#${a[3]}`:t.replace(/^https?:\/\//,"")}R.__docgenInfo={description:"",methods:[],displayName:"ShippedWidget"};var l,m,u,h,x,v,f,y,_,g,w,T,E,b,S;const{expect:c,within:B}=__STORYBOOK_MODULE_TEST__,j=[{id:"t1",title:"Wire up the scheduler tick metric",status:"done",priority:1,retryCount:0,fixAttempts:0,tags:[],prUrl:"https://github.com/midnite/midnite/pull/45",createdAt:"2026-06-20T08:00:00.000Z",updatedAt:"2026-06-21T09:00:00.000Z",events:[]},{id:"t2",title:"Ship the repo registry migration",status:"done",priority:2,retryCount:0,fixAttempts:0,tags:[],createdAt:"2026-06-19T08:00:00.000Z",updatedAt:"2026-06-20T09:00:00.000Z",events:[]},{id:"t3",title:"Draft the Phase 26 plan",status:"wip",priority:1,retryCount:0,fixAttempts:0,tags:[],events:[]}],jt={title:"Widgets/ShippedWidget",component:R,decorators:[t=>e.jsx("div",{className:"h-80 w-80",children:e.jsx(t,{})})]},i={beforeEach:()=>k([{match:"/tasks",json:{items:j,total:j.length}}]),play:async({canvasElement:t})=>{const a=B(t);await c(await a.findByText(j[0].title)).toBeInTheDocument(),await c(a.getByText("midnite/midnite#45")).toBeInTheDocument(),await c(a.getByText("no PR linked")).toBeInTheDocument()}},p={beforeEach:()=>k([{match:"/tasks",json:{items:[{id:"t0",title:"Still in progress",status:"wip",priority:1,retryCount:0,tags:[]}],total:1}}]),play:async({canvasElement:t})=>{const a=B(t);await c(await a.findByText("Nothing shipped yet.")).toBeInTheDocument()}},d={beforeEach:()=>k([{match:"/tasks",status:500}]),play:async({canvasElement:t})=>{const a=B(t);await c(await a.findByText("Couldn’t load shipped work.")).toBeInTheDocument()}};i.parameters={...i.parameters,docs:{...(l=i.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
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
}`,...(u=i.parameters)===null||u===void 0||(m=u.docs)===null||m===void 0?void 0:m.source},description:{story:"Completed work loaded from the gateway, newest first, with PR labels.",...(x=i.parameters)===null||x===void 0||(h=x.docs)===null||h===void 0?void 0:h.description}}};p.parameters={...p.parameters,docs:{...(v=p.parameters)===null||v===void 0?void 0:v.docs,source:{originalSource:`{
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
}`,...(y=p.parameters)===null||y===void 0||(f=y.docs)===null||f===void 0?void 0:f.source},description:{story:"Tasks exist but none are shipped → the empty-state message.",...(g=p.parameters)===null||g===void 0||(_=g.docs)===null||_===void 0?void 0:_.description}}};d.parameters={...d.parameters,docs:{...(w=d.parameters)===null||w===void 0?void 0:w.docs,source:{originalSource:`{
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
}`,...(E=d.parameters)===null||E===void 0||(T=E.docs)===null||T===void 0?void 0:T.source},description:{story:"Gateway tasks endpoint fails → the error fallback.",...(S=d.parameters)===null||S===void 0||(b=S.docs)===null||b===void 0?void 0:b.description}}};const kt=["Default","Empty","Error"];export{i as Default,p as Empty,d as Error,kt as __namedExportsOrder,jt as default};
