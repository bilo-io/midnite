import{aX as t,aJ as D,b7 as R}from"./iframe-DlvE0Ums.js";import{i as T}from"./mock-fetch-aFrr3kfG.js";import{H as S}from"./api-DlXZggbX.js";import{u as O}from"./use-polling-A8YC_Jon.js";import{W}from"./spinner-DYgsAzKN.js";import{W as A}from"./widget-card-DDwue7pO.js";import{B as C}from"./brain-DL35hs6Y.js";import{R as F}from"./refresh-cw-CTJoTJBx.js";import"./preload-helper-Dp1pzeXC.js";import"./useQuery-DxKlrddY.js";const G=6e4,P=6;function I(){const{data:e,error:a,loading:b,refresh:M}=O(()=>S(),G),B=(e??[]).filter(o=>!o.archived).sort((o,k)=>new Date(k.updatedAt).getTime()-new Date(o.updatedAt).getTime()).slice(0,P);return t.jsx(A,{title:"Recent memories",icon:C,actions:t.jsx("button",{type:"button",onClick:M,"aria-label":"Refresh memories",className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:t.jsx(F,{className:D("h-3 w-3",b&&"animate-spin")})}),bodyClassName:"overflow-auto",children:a&&!e?t.jsx("p",{className:"px-4 py-6 text-center text-sm text-destructive",children:"Couldn’t load memories."}):!e&&b?t.jsx(W,{}):B.length===0?t.jsx("p",{className:"px-4 py-6 text-center text-sm text-muted-foreground",children:"No memories yet."}):t.jsx("ul",{className:"divide-y divide-border/30",children:B.map(o=>t.jsx(Z,{memory:o},o.id))})})}function Z({memory:e}){return t.jsxs("li",{className:"px-4 py-2",children:[t.jsxs("div",{className:"flex items-center gap-2",children:[t.jsx("span",{className:"min-w-0 flex-1 truncate text-sm font-medium",children:e.title}),t.jsx("span",{className:D("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",e.projectId===null?"bg-primary/15 text-primary":"bg-muted text-muted-foreground"),children:e.projectId===null?"Global":"Project"})]}),e.content&&t.jsx("p",{className:"mt-0.5 line-clamp-2 text-[11px] text-muted-foreground",children:e.content}),t.jsxs("span",{className:"mt-0.5 block text-[10px] tabular-nums text-muted-foreground",children:["Updated ",R(e.updatedAt)]})]})}I.__docgenInfo={description:"",methods:[],displayName:"MemoriesWidget"};var c,m,d,l,p,u,x,h,v,f,y,_,g,E,w;const{expect:i,within:j}=__STORYBOOK_MODULE_TEST__,N=[{id:"m1",title:"Use worktrees for parallel work",content:"Default to a dedicated git worktree per feature branch.",projectId:null,sources:[],createdAt:"2026-06-01T09:00:00.000Z",updatedAt:"2026-06-21T09:00:00.000Z"},{id:"m2",title:"Web tests fail in .git worktrees",content:"Vite denies `.git/**`, so run web tests from the primary checkout.",projectId:"p-midnite",sources:[],createdAt:"2026-06-02T09:00:00.000Z",updatedAt:"2026-06-20T09:00:00.000Z"}],$={title:"Widgets/MemoriesWidget",component:I,decorators:[e=>t.jsx("div",{className:"h-80 w-80",children:t.jsx(e,{})})]},U=[{match:"/memories",json:{memories:N}}],r={beforeEach:()=>T(U),play:async({canvasElement:e})=>{const a=j(e);await i(await a.findByText(N[0].title)).toBeInTheDocument(),await i(a.getByText("Global")).toBeInTheDocument(),await i(a.getByText("Project")).toBeInTheDocument()}},s={beforeEach:()=>T([{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:e})=>{const a=j(e);await i(await a.findByText("No memories yet.")).toBeInTheDocument()}},n={beforeEach:()=>T([{match:"/memories",status:500}]),play:async({canvasElement:e})=>{const a=j(e);await i(await a.findByText("Couldn’t load memories.")).toBeInTheDocument()}};r.parameters={...r.parameters,docs:{...(c=r.parameters)===null||c===void 0?void 0:c.docs,source:{originalSource:`{
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
}`,...(d=r.parameters)===null||d===void 0||(m=d.docs)===null||m===void 0?void 0:m.source},description:{story:"Recent memories loaded from the gateway, global + project scoped.",...(p=r.parameters)===null||p===void 0||(l=p.docs)===null||l===void 0?void 0:l.description}}};s.parameters={...s.parameters,docs:{...(u=s.parameters)===null||u===void 0?void 0:u.docs,source:{originalSource:`{
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
}`,...(h=s.parameters)===null||h===void 0||(x=h.docs)===null||x===void 0?void 0:x.source},description:{story:"No memories yet → the empty-state message.",...(f=s.parameters)===null||f===void 0||(v=f.docs)===null||v===void 0?void 0:v.description}}};n.parameters={...n.parameters,docs:{...(y=n.parameters)===null||y===void 0?void 0:y.docs,source:{originalSource:`{
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
}`,...(g=n.parameters)===null||g===void 0||(_=g.docs)===null||_===void 0?void 0:_.source},description:{story:"Gateway memories endpoint fails → the error fallback.",...(w=n.parameters)===null||w===void 0||(E=w.docs)===null||E===void 0?void 0:E.description}}};const ee=["Default","Empty","Error"];export{r as Default,s as Empty,n as Error,ee as __namedExportsOrder,$ as default};
