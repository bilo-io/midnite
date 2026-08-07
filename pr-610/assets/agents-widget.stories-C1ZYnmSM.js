import{b2 as M,a$ as t,aM as C,a as P}from"./iframe-DA-MmuZw.js";import{i as u}from"./mock-fetch-aFrr3kfG.js";import{B as K,aa as U}from"./api-CbRpmCQt.js";import{u as $}from"./dashboard-widget-labels-CettC7X9.js";import{h as X}from"./i18n-labels-ssqVjSYO.js";import{u as G}from"./use-polling-DaMSsPtK.js";import{W as Y}from"./spinner-C4HVZ8vT.js";import{W as q}from"./widget-card-CqWnX_dq.js";import{B as z}from"./bot-CyeANd2e.js";import{R as J}from"./refresh-cw-BXqiditT.js";import"./preload-helper-Dp1pzeXC.js";import"./star-9ODqe9Ke.js";import"./chart-line-BcKL0qJC.js";import"./layout-grid-Cb2f6RTP.js";import"./globe-BCZeNR_x.js";import"./database-DqUgOpPv.js";import"./rocket-BqJBoI9W.js";import"./newspaper-DDGpAr2w.js";import"./users-CLxoO2JM.js";import"./folder-git-2-YsTmjJcm.js";import"./brain-kshfOTAZ.js";import"./workflow-CFh-lfkO.js";import"./square-terminal-ByXmHm-T.js";import"./clock-9o1gbOUD.js";import"./sticky-note-C0O7NCHS.js";import"./useQuery-s8tFbTx4.js";const Q=6e4,V=5*6e4;function F(){var a;const e=M("dashboard"),Z=$(),H=X(),m=G(()=>K(),Q),r=G(()=>U(),V),W=()=>{m.refresh(),r.refresh()},n=m.data;return t.jsx(q,{title:Z.label("agents"),icon:z,actions:t.jsx("button",{type:"button",onClick:W,"aria-label":e("agents.refresh"),className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:t.jsx(J,{className:C("h-3 w-3",(m.loading||r.loading)&&"animate-spin")})}),bodyClassName:"overflow-auto p-4",children:m.error&&!n?t.jsx("p",{className:"py-6 text-center text-sm text-destructive",children:e("agents.error")}):n?t.jsxs("div",{className:"space-y-3",children:[t.jsxs("div",{className:"flex items-start gap-2",children:[t.jsx("span",{"aria-hidden":!0,className:C("mt-1 h-2 w-2 shrink-0 rounded-full",r.data?r.data.ok?"bg-emerald-500":"bg-destructive":"bg-muted-foreground/40")}),t.jsxs("div",{className:"min-w-0 flex-1",children:[t.jsx("span",{className:"block truncate text-sm font-semibold",children:n.primary.name||e("agents.primaryFallback")}),t.jsxs("span",{className:"block truncate text-[11px] text-muted-foreground",children:[P[n.cli],!((a=r.data)===null||a===void 0)&&a.model?` · ${r.data.model}`:""]})]})]}),t.jsx("p",{className:"text-[11px] text-muted-foreground",children:n.primary.heartbeatEnabled?n.primary.lastHeartbeatAt?e("agents.heartbeatOnWithLast",{hours:n.primary.heartbeatIntervalH,when:H(n.primary.lastHeartbeatAt)}):e("agents.heartbeatOn",{hours:n.primary.heartbeatIntervalH}):e("agents.heartbeatOff")}),t.jsxs("div",{children:[t.jsx("span",{className:"text-[10px] font-medium uppercase tracking-wider text-muted-foreground",children:e("agents.subAgents",{count:n.subAgents.length})}),n.subAgents.length===0?t.jsx("p",{className:"mt-1 text-[11px] text-muted-foreground",children:e("agents.noSubAgents")}):t.jsx("ul",{className:"mt-1.5 space-y-2",children:n.subAgents.map(o=>t.jsxs("li",{className:"space-y-0.5",children:[t.jsx("span",{className:"block truncate text-[11px] font-medium",children:o.name||e("agents.unnamed")}),o.role&&t.jsx("span",{className:"block text-[11px] leading-snug text-muted-foreground line-clamp-2",title:o.role,children:o.role})]},o.id))})]})]}):t.jsx(Y,{})})}F.__docgenInfo={description:"",methods:[],displayName:"AgentsWidget"};var v,f,b,x,_,y,T,w,N,A,E,B,I,j,O,D,R,L,S,k;const{expect:s,within:g}=__STORYBOOK_MODULE_TEST__,p={cli:"claude",primary:{name:"Orchestrator",description:"The single orchestrator agent.",heartbeatEnabled:!0,heartbeatPrompt:"Check the board and pick up ready work.",heartbeatIntervalH:6,lastHeartbeatAt:"2026-06-23T08:00:00.000Z",updatedAt:"2026-06-23T08:00:00.000Z"},subAgents:[{id:"sa1",name:"Reviewer",role:"Code review",description:"Reviews diffs before merge.",createdAt:"2026-06-20T09:00:00.000Z",updatedAt:"2026-06-20T09:00:00.000Z"}]},ee={ok:!0,cli:"claude",model:"claude-opus-4-8",reply:"pong"},Ie={title:"Widgets/AgentsWidget",component:F,decorators:[(a,e)=>t.jsx("div",{className:e.parameters.tall?"h-[600px] w-80":"h-80 w-80",children:t.jsx(a,{})})]},h={match:"/agents/ping",json:ee},i={beforeEach:()=>u([h,{match:"/agents",json:{config:p}}]),play:async({canvasElement:a})=>{const e=g(a);await s(await e.findByText("Orchestrator")).toBeInTheDocument(),await s(e.getByText("Reviewer")).toBeInTheDocument(),await s(e.getByText(/Heartbeat every 6h/)).toBeInTheDocument()}},c={beforeEach:()=>u([h,{match:"/agents",json:{config:{...p,primary:{...p.primary,heartbeatEnabled:!1},subAgents:[]}}}]),play:async({canvasElement:a})=>{const e=g(a);await s(await e.findByText("Heartbeat off")).toBeInTheDocument(),await s(e.getByText("None configured.")).toBeInTheDocument()}},d={beforeEach:()=>u([h,{match:"/agents",status:500}]),play:async({canvasElement:a})=>{const e=g(a);await s(await e.findByText("Couldn’t load agents.")).toBeInTheDocument()}},te={...p,subAgents:[{id:"a",name:"Architect",role:"Designs the technical approach and turns a goal into a concrete, reviewable implementation plan.",description:"",createdAt:"2026-06-20T09:00:00.000Z",updatedAt:"2026-06-20T09:00:00.000Z"},{id:"b",name:"Designer",role:"Owns the UI and UX — layout, component structure, interaction, visual polish, and accessibility.",description:"",createdAt:"2026-06-20T09:00:00.000Z",updatedAt:"2026-06-20T09:00:00.000Z"},{id:"c",name:"Security",role:"Audits changes for vulnerabilities, unsafe patterns, secret exposure, and abuse vectors.",description:"",createdAt:"2026-06-20T09:00:00.000Z",updatedAt:"2026-06-20T09:00:00.000Z"},{id:"d",name:"Reviewer",role:"Reviews diffs for correctness, clarity, and adherence to the project's conventions.",description:"",createdAt:"2026-06-20T09:00:00.000Z",updatedAt:"2026-06-20T09:00:00.000Z"},{id:"e",name:"Tester",role:"Writes and runs tests, reproduces bugs, and verifies that changes behave correctly.",description:"",createdAt:"2026-06-20T09:00:00.000Z",updatedAt:"2026-06-20T09:00:00.000Z"}]},l={parameters:{tall:!0},beforeEach:()=>u([h,{match:"/agents",json:{config:te}}]),play:async({canvasElement:a})=>{const e=g(a);await s(await e.findByText("Security")).toBeInTheDocument(),await s(e.getByText(/Audits changes for vulnerabilities/)).toBeInTheDocument()}};i.parameters={...i.parameters,docs:{...(v=i.parameters)===null||v===void 0?void 0:v.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([PING_OK, {
    match: '/agents',
    json: {
      config: CONFIG
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Orchestrator')).toBeInTheDocument();
    await expect(canvas.getByText('Reviewer')).toBeInTheDocument();
    await expect(canvas.getByText(/Heartbeat every 6h/)).toBeInTheDocument();
  }
}`,...(b=i.parameters)===null||b===void 0||(f=b.docs)===null||f===void 0?void 0:f.source},description:{story:"Config + a healthy ping loaded from the gateway.",...(_=i.parameters)===null||_===void 0||(x=_.docs)===null||x===void 0?void 0:x.description}}};c.parameters={...c.parameters,docs:{...(y=c.parameters)===null||y===void 0?void 0:y.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([PING_OK, {
    match: '/agents',
    json: {
      config: {
        ...CONFIG,
        primary: {
          ...CONFIG.primary,
          heartbeatEnabled: false
        },
        subAgents: []
      }
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Heartbeat off')).toBeInTheDocument();
    await expect(canvas.getByText('None configured.')).toBeInTheDocument();
  }
}`,...(w=c.parameters)===null||w===void 0||(T=w.docs)===null||T===void 0?void 0:T.source},description:{story:"No sub-agents and heartbeat off → the inert-state copy.",...(A=c.parameters)===null||A===void 0||(N=A.docs)===null||N===void 0?void 0:N.description}}};d.parameters={...d.parameters,docs:{...(E=d.parameters)===null||E===void 0?void 0:E.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([PING_OK, {
    match: '/agents',
    status: 500
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Couldn’t load agents.')).toBeInTheDocument();
  }
}`,...(I=d.parameters)===null||I===void 0||(B=I.docs)===null||B===void 0?void 0:B.source},description:{story:"Gateway `/agents` fails → the error fallback.",...(O=d.parameters)===null||O===void 0||(j=O.docs)===null||j===void 0?void 0:j.description}}};l.parameters={...l.parameters,docs:{...(D=l.parameters)===null||D===void 0?void 0:D.docs,source:{originalSource:`{
  parameters: {
    tall: true
  },
  beforeEach: () => installMockFetch([PING_OK, {
    match: '/agents',
    json: {
      config: LONG_ROLE_CONFIG
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Security')).toBeInTheDocument();
    await expect(canvas.getByText(/Audits changes for vulnerabilities/)).toBeInTheDocument();
  }
}`,...(L=l.parameters)===null||L===void 0||(R=L.docs)===null||R===void 0?void 0:R.source},description:{story:"Long, sentence-length roles: name and role stack instead of colliding on one row.",...(k=l.parameters)===null||k===void 0||(S=k.docs)===null||S===void 0?void 0:S.description}}};const je=["Default","NoSubAgents","Error","LongRoles"];export{i as Default,d as Error,l as LongRoles,c as NoSubAgents,je as __namedExportsOrder,Ie as default};
