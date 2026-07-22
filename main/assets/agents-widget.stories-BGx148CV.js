import{aX as e,aJ as C,a as Z,b7 as H}from"./iframe-DfP72MuT.js";import{i as p}from"./mock-fetch-aFrr3kfG.js";import{x as P,a7 as W}from"./api-CugRGZcA.js";import{u as G}from"./use-polling-Cikz4KxD.js";import{W as M}from"./spinner-B7OPgnKb.js";import{W as K}from"./widget-card-D-SzkEyf.js";import{B as U}from"./bot-CNTOlI4z.js";import{R as $}from"./refresh-cw-BKVagDRv.js";import"./preload-helper-Dp1pzeXC.js";import"./useQuery-CbjgFMUx.js";const X=6e4,J=5*6e4;function L(){var a;const t=G(()=>P(),X),r=G(()=>W(),J),F=()=>{t.refresh(),r.refresh()},n=t.data;return e.jsx(K,{title:"Agent pool",icon:U,actions:e.jsx("button",{type:"button",onClick:F,"aria-label":"Refresh agent status",className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:e.jsx($,{className:C("h-3 w-3",(t.loading||r.loading)&&"animate-spin")})}),bodyClassName:"overflow-auto p-4",children:t.error&&!n?e.jsx("p",{className:"py-6 text-center text-sm text-destructive",children:"Couldn’t load agents."}):n?e.jsxs("div",{className:"space-y-3",children:[e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx("span",{"aria-hidden":!0,className:C("mt-1 h-2 w-2 shrink-0 rounded-full",r.data?r.data.ok?"bg-emerald-500":"bg-destructive":"bg-muted-foreground/40")}),e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("span",{className:"block truncate text-sm font-semibold",children:n.primary.name||"Primary agent"}),e.jsxs("span",{className:"block truncate text-[11px] text-muted-foreground",children:[Z[n.cli],!((a=r.data)===null||a===void 0)&&a.model?` · ${r.data.model}`:""]})]})]}),e.jsx("p",{className:"text-[11px] text-muted-foreground",children:n.primary.heartbeatEnabled?`Heartbeat every ${n.primary.heartbeatIntervalH}h${n.primary.lastHeartbeatAt?` · last ${H(n.primary.lastHeartbeatAt)}`:""}`:"Heartbeat off"}),e.jsxs("div",{children:[e.jsxs("span",{className:"text-[10px] font-medium uppercase tracking-wider text-muted-foreground",children:["Sub-agents (",n.subAgents.length,")"]}),n.subAgents.length===0?e.jsx("p",{className:"mt-1 text-[11px] text-muted-foreground",children:"None configured."}):e.jsx("ul",{className:"mt-1.5 space-y-2",children:n.subAgents.map(o=>e.jsxs("li",{className:"space-y-0.5",children:[e.jsx("span",{className:"block truncate text-[11px] font-medium",children:o.name||"Unnamed"}),o.role&&e.jsx("span",{className:"block text-[11px] leading-snug text-muted-foreground line-clamp-2",title:o.role,children:o.role})]},o.id))})]})]}):e.jsx(M,{})})}L.__docgenInfo={description:"",methods:[],displayName:"AgentsWidget"};var h,v,f,x,_,b,y,T,w,N,A,E,B,I,j,D,O,R,S,k;const{expect:s,within:u}=__STORYBOOK_MODULE_TEST__,m={cli:"claude",primary:{name:"Orchestrator",description:"The single orchestrator agent.",heartbeatEnabled:!0,heartbeatPrompt:"Check the board and pick up ready work.",heartbeatIntervalH:6,lastHeartbeatAt:"2026-06-23T08:00:00.000Z",updatedAt:"2026-06-23T08:00:00.000Z"},subAgents:[{id:"sa1",name:"Reviewer",role:"Code review",description:"Reviews diffs before merge.",createdAt:"2026-06-20T09:00:00.000Z",updatedAt:"2026-06-20T09:00:00.000Z"}]},Y={ok:!0,cli:"claude",model:"claude-opus-4-8",reply:"pong"},ie={title:"Widgets/AgentsWidget",component:L,decorators:[(a,t)=>e.jsx("div",{className:t.parameters.tall?"h-[600px] w-80":"h-80 w-80",children:e.jsx(a,{})})]},g={match:"/agents/ping",json:Y},i={beforeEach:()=>p([g,{match:"/agents",json:{config:m}}]),play:async({canvasElement:a})=>{const t=u(a);await s(await t.findByText("Orchestrator")).toBeInTheDocument(),await s(t.getByText("Reviewer")).toBeInTheDocument(),await s(t.getByText(/Heartbeat every 6h/)).toBeInTheDocument()}},c={beforeEach:()=>p([g,{match:"/agents",json:{config:{...m,primary:{...m.primary,heartbeatEnabled:!1},subAgents:[]}}}]),play:async({canvasElement:a})=>{const t=u(a);await s(await t.findByText("Heartbeat off")).toBeInTheDocument(),await s(t.getByText("None configured.")).toBeInTheDocument()}},d={beforeEach:()=>p([g,{match:"/agents",status:500}]),play:async({canvasElement:a})=>{const t=u(a);await s(await t.findByText("Couldn’t load agents.")).toBeInTheDocument()}},q={...m,subAgents:[{id:"a",name:"Architect",role:"Designs the technical approach and turns a goal into a concrete, reviewable implementation plan.",description:"",createdAt:"2026-06-20T09:00:00.000Z",updatedAt:"2026-06-20T09:00:00.000Z"},{id:"b",name:"Designer",role:"Owns the UI and UX — layout, component structure, interaction, visual polish, and accessibility.",description:"",createdAt:"2026-06-20T09:00:00.000Z",updatedAt:"2026-06-20T09:00:00.000Z"},{id:"c",name:"Security",role:"Audits changes for vulnerabilities, unsafe patterns, secret exposure, and abuse vectors.",description:"",createdAt:"2026-06-20T09:00:00.000Z",updatedAt:"2026-06-20T09:00:00.000Z"},{id:"d",name:"Reviewer",role:"Reviews diffs for correctness, clarity, and adherence to the project's conventions.",description:"",createdAt:"2026-06-20T09:00:00.000Z",updatedAt:"2026-06-20T09:00:00.000Z"},{id:"e",name:"Tester",role:"Writes and runs tests, reproduces bugs, and verifies that changes behave correctly.",description:"",createdAt:"2026-06-20T09:00:00.000Z",updatedAt:"2026-06-20T09:00:00.000Z"}]},l={parameters:{tall:!0},beforeEach:()=>p([g,{match:"/agents",json:{config:q}}]),play:async({canvasElement:a})=>{const t=u(a);await s(await t.findByText("Security")).toBeInTheDocument(),await s(t.getByText(/Audits changes for vulnerabilities/)).toBeInTheDocument()}};i.parameters={...i.parameters,docs:{...(h=i.parameters)===null||h===void 0?void 0:h.docs,source:{originalSource:`{
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
}`,...(f=i.parameters)===null||f===void 0||(v=f.docs)===null||v===void 0?void 0:v.source},description:{story:"Config + a healthy ping loaded from the gateway.",...(_=i.parameters)===null||_===void 0||(x=_.docs)===null||x===void 0?void 0:x.description}}};c.parameters={...c.parameters,docs:{...(b=c.parameters)===null||b===void 0?void 0:b.docs,source:{originalSource:`{
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
}`,...(T=c.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"No sub-agents and heartbeat off → the inert-state copy.",...(N=c.parameters)===null||N===void 0||(w=N.docs)===null||w===void 0?void 0:w.description}}};d.parameters={...d.parameters,docs:{...(A=d.parameters)===null||A===void 0?void 0:A.docs,source:{originalSource:`{
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
}`,...(B=d.parameters)===null||B===void 0||(E=B.docs)===null||E===void 0?void 0:E.source},description:{story:"Gateway `/agents` fails → the error fallback.",...(j=d.parameters)===null||j===void 0||(I=j.docs)===null||I===void 0?void 0:I.description}}};l.parameters={...l.parameters,docs:{...(D=l.parameters)===null||D===void 0?void 0:D.docs,source:{originalSource:`{
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
}`,...(R=l.parameters)===null||R===void 0||(O=R.docs)===null||O===void 0?void 0:O.source},description:{story:"Long, sentence-length roles: name and role stack instead of colliding on one row.",...(k=l.parameters)===null||k===void 0||(S=k.docs)===null||S===void 0?void 0:S.description}}};const ce=["Default","NoSubAgents","Error","LongRoles"];export{i as Default,d as Error,l as LongRoles,c as NoSubAgents,ce as __namedExportsOrder,ie as default};
