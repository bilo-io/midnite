import{b2 as I,a$ as t,aM as M}from"./iframe-DA-MmuZw.js";import{i as T}from"./mock-fetch-aFrr3kfG.js";import{K as O}from"./api-CbRpmCQt.js";import{u as A}from"./dashboard-widget-labels-CettC7X9.js";import{h as C}from"./i18n-labels-ssqVjSYO.js";import{u as F}from"./use-polling-DaMSsPtK.js";import{W as L}from"./spinner-C4HVZ8vT.js";import{W as G}from"./widget-card-CqWnX_dq.js";import{B as P}from"./brain-kshfOTAZ.js";import{R as Z}from"./refresh-cw-BXqiditT.js";import"./preload-helper-Dp1pzeXC.js";import"./star-9ODqe9Ke.js";import"./chart-line-BcKL0qJC.js";import"./layout-grid-Cb2f6RTP.js";import"./globe-BCZeNR_x.js";import"./database-DqUgOpPv.js";import"./rocket-BqJBoI9W.js";import"./newspaper-DDGpAr2w.js";import"./users-CLxoO2JM.js";import"./folder-git-2-YsTmjJcm.js";import"./bot-CyeANd2e.js";import"./workflow-CFh-lfkO.js";import"./square-terminal-ByXmHm-T.js";import"./clock-9o1gbOUD.js";import"./sticky-note-C0O7NCHS.js";import"./useQuery-s8tFbTx4.js";const K=6e4,U=6;function N(){const e=I("dashboard"),o=A(),{data:r,error:R,loading:B,refresh:S}=F(()=>O(),K),D=(r??[]).filter(a=>!a.archived).sort((a,W)=>new Date(W.updatedAt).getTime()-new Date(a.updatedAt).getTime()).slice(0,U);return t.jsx(G,{title:o.label("memories"),icon:P,actions:t.jsx("button",{type:"button",onClick:S,"aria-label":e("memories.refresh"),className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:t.jsx(Z,{className:M("h-3 w-3",B&&"animate-spin")})}),bodyClassName:"overflow-auto",children:R&&!r?t.jsx("p",{className:"px-4 py-6 text-center text-sm text-destructive",children:e("memories.error")}):!r&&B?t.jsx(L,{}):D.length===0?t.jsx("p",{className:"px-4 py-6 text-center text-sm text-muted-foreground",children:e("memories.empty")}):t.jsx("ul",{className:"divide-y divide-border/30",children:D.map(a=>t.jsx(H,{memory:a},a.id))})})}function H({memory:e}){const o=I("dashboard"),r=C();return t.jsxs("li",{className:"px-4 py-2",children:[t.jsxs("div",{className:"flex items-center gap-2",children:[t.jsx("span",{className:"min-w-0 flex-1 truncate text-sm font-medium",children:e.title}),t.jsx("span",{className:M("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",e.projectId===null?"bg-primary/15 text-primary":"bg-muted text-muted-foreground"),children:e.projectId===null?o("memories.scopeGlobal"):o("memories.scopeProject")})]}),e.content&&t.jsx("p",{className:"mt-0.5 line-clamp-2 text-[11px] text-muted-foreground",children:e.content}),t.jsx("span",{className:"mt-0.5 block text-[10px] tabular-nums text-muted-foreground",children:o("memories.updated",{when:r(e.updatedAt)})})]})}N.__docgenInfo={description:"",methods:[],displayName:"MemoriesWidget"};var c,d,l,p,u,h,x,v,f,y,_,g,w,E,b;const{expect:m,within:j}=__STORYBOOK_MODULE_TEST__,k=[{id:"m1",title:"Use worktrees for parallel work",content:"Default to a dedicated git worktree per feature branch.",projectId:null,sources:[],createdAt:"2026-06-01T09:00:00.000Z",updatedAt:"2026-06-21T09:00:00.000Z"},{id:"m2",title:"Web tests fail in .git worktrees",content:"Vite denies `.git/**`, so run web tests from the primary checkout.",projectId:"p-midnite",sources:[],createdAt:"2026-06-02T09:00:00.000Z",updatedAt:"2026-06-20T09:00:00.000Z"}],_e={title:"Widgets/MemoriesWidget",component:N,decorators:[e=>t.jsx("div",{className:"h-80 w-80",children:t.jsx(e,{})})]},V=[{match:"/memories",json:{memories:k}}],s={beforeEach:()=>T(V),play:async({canvasElement:e})=>{const o=j(e);await m(await o.findByText(k[0].title)).toBeInTheDocument(),await m(o.getByText("Global")).toBeInTheDocument(),await m(o.getByText("Project")).toBeInTheDocument()}},n={beforeEach:()=>T([{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:e})=>{const o=j(e);await m(await o.findByText("No memories yet.")).toBeInTheDocument()}},i={beforeEach:()=>T([{match:"/memories",status:500}]),play:async({canvasElement:e})=>{const o=j(e);await m(await o.findByText("Couldn’t load memories.")).toBeInTheDocument()}};s.parameters={...s.parameters,docs:{...(c=s.parameters)===null||c===void 0?void 0:c.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch(memoriesOk),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(MEMORIES[0]!.title)).toBeInTheDocument();
    // Scope badges render from the projectId discriminator.
    await expect(canvas.getByText('Global')).toBeInTheDocument();
    await expect(canvas.getByText('Project')).toBeInTheDocument();
  }
}`,...(l=s.parameters)===null||l===void 0||(d=l.docs)===null||d===void 0?void 0:d.source},description:{story:"Recent memories loaded from the gateway, global + project scoped.",...(u=s.parameters)===null||u===void 0||(p=u.docs)===null||p===void 0?void 0:p.description}}};n.parameters={...n.parameters,docs:{...(h=n.parameters)===null||h===void 0?void 0:h.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/memories',
    json: {
      memories: []
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('No memories yet.')).toBeInTheDocument();
  }
}`,...(v=n.parameters)===null||v===void 0||(x=v.docs)===null||x===void 0?void 0:x.source},description:{story:"No memories yet → the empty-state message.",...(y=n.parameters)===null||y===void 0||(f=y.docs)===null||f===void 0?void 0:f.description}}};i.parameters={...i.parameters,docs:{...(_=i.parameters)===null||_===void 0?void 0:_.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/memories',
    status: 500
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Couldn’t load memories.')).toBeInTheDocument();
  }
}`,...(w=i.parameters)===null||w===void 0||(g=w.docs)===null||g===void 0?void 0:g.source},description:{story:"Gateway memories endpoint fails → the error fallback.",...(b=i.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const ge=["Default","Empty","Error"];export{s as Default,n as Empty,i as Error,ge as __namedExportsOrder,_e as default};
