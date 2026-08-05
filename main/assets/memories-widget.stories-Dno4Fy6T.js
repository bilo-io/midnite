import{b1 as I,a_ as t,aL as N}from"./iframe-CzW4mhwb.js";import{i as T}from"./mock-fetch-aFrr3kfG.js";import{K as O}from"./api-D5zsh0uM.js";import{u as A}from"./dashboard-widget-labels-BdAvfwtD.js";import{h as C}from"./i18n-labels-C4RosFBs.js";import{u as L}from"./use-polling-COtYyagt.js";import{W as F}from"./spinner-C37ILLly.js";import{W as G}from"./widget-card-C7BUS7ZY.js";import{B as P}from"./brain-KdhMDYv4.js";import{R as Z}from"./refresh-cw-F_jABSKx.js";import"./preload-helper-Dp1pzeXC.js";import"./star-CR16NGgg.js";import"./chart-line-SwSXTEQN.js";import"./layout-grid-W8yl9e_T.js";import"./globe-Bfh7y07u.js";import"./database-BrSvq5oh.js";import"./rocket-BajeCrMB.js";import"./newspaper-DLSaxLrG.js";import"./users-QW3mIzM3.js";import"./folder-git-2-B9hvt5tA.js";import"./bot-CjilspNc.js";import"./workflow-DNXBj_j0.js";import"./square-terminal-BQaWLVHK.js";import"./clock-aG7GHARr.js";import"./sticky-note-BjmlHczO.js";import"./useQuery-B_xDZICD.js";const K=6e4,U=6;function M(){const e=I("dashboard"),o=A(),{data:r,error:R,loading:B,refresh:S}=L(()=>O(),K),D=(r??[]).filter(a=>!a.archived).sort((a,W)=>new Date(W.updatedAt).getTime()-new Date(a.updatedAt).getTime()).slice(0,U);return t.jsx(G,{title:o.label("memories"),icon:P,actions:t.jsx("button",{type:"button",onClick:S,"aria-label":e("memories.refresh"),className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:t.jsx(Z,{className:N("h-3 w-3",B&&"animate-spin")})}),bodyClassName:"overflow-auto",children:R&&!r?t.jsx("p",{className:"px-4 py-6 text-center text-sm text-destructive",children:e("memories.error")}):!r&&B?t.jsx(F,{}):D.length===0?t.jsx("p",{className:"px-4 py-6 text-center text-sm text-muted-foreground",children:e("memories.empty")}):t.jsx("ul",{className:"divide-y divide-border/30",children:D.map(a=>t.jsx(H,{memory:a},a.id))})})}function H({memory:e}){const o=I("dashboard"),r=C();return t.jsxs("li",{className:"px-4 py-2",children:[t.jsxs("div",{className:"flex items-center gap-2",children:[t.jsx("span",{className:"min-w-0 flex-1 truncate text-sm font-medium",children:e.title}),t.jsx("span",{className:N("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",e.projectId===null?"bg-primary/15 text-primary":"bg-muted text-muted-foreground"),children:e.projectId===null?o("memories.scopeGlobal"):o("memories.scopeProject")})]}),e.content&&t.jsx("p",{className:"mt-0.5 line-clamp-2 text-[11px] text-muted-foreground",children:e.content}),t.jsx("span",{className:"mt-0.5 block text-[10px] tabular-nums text-muted-foreground",children:o("memories.updated",{when:r(e.updatedAt)})})]})}M.__docgenInfo={description:"",methods:[],displayName:"MemoriesWidget"};var c,d,l,p,u,h,x,v,f,y,_,g,w,E,b;const{expect:m,within:j}=__STORYBOOK_MODULE_TEST__,k=[{id:"m1",title:"Use worktrees for parallel work",content:"Default to a dedicated git worktree per feature branch.",projectId:null,sources:[],createdAt:"2026-06-01T09:00:00.000Z",updatedAt:"2026-06-21T09:00:00.000Z"},{id:"m2",title:"Web tests fail in .git worktrees",content:"Vite denies `.git/**`, so run web tests from the primary checkout.",projectId:"p-midnite",sources:[],createdAt:"2026-06-02T09:00:00.000Z",updatedAt:"2026-06-20T09:00:00.000Z"}],_e={title:"Widgets/MemoriesWidget",component:M,decorators:[e=>t.jsx("div",{className:"h-80 w-80",children:t.jsx(e,{})})]},V=[{match:"/memories",json:{memories:k}}],s={beforeEach:()=>T(V),play:async({canvasElement:e})=>{const o=j(e);await m(await o.findByText(k[0].title)).toBeInTheDocument(),await m(o.getByText("Global")).toBeInTheDocument(),await m(o.getByText("Project")).toBeInTheDocument()}},n={beforeEach:()=>T([{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:e})=>{const o=j(e);await m(await o.findByText("No memories yet.")).toBeInTheDocument()}},i={beforeEach:()=>T([{match:"/memories",status:500}]),play:async({canvasElement:e})=>{const o=j(e);await m(await o.findByText("Couldn’t load memories.")).toBeInTheDocument()}};s.parameters={...s.parameters,docs:{...(c=s.parameters)===null||c===void 0?void 0:c.docs,source:{originalSource:`{
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
