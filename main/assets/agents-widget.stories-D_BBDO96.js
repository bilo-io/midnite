import{n as e,f as A,s as S}from"./iframe-pMjuI2BH.js";import{i as j}from"./mock-fetch-aFrr3kfG.js";import{a as k}from"./inbound-B8us280C.js";import{n as G,I as H}from"./api-4WxRUCnO.js";import{u as D}from"./use-polling-CVxeAdNQ.js";import{W as R}from"./spinner-BlpCu6gs.js";import{W as F}from"./widget-card-BCPnMaqO.js";import{B as P}from"./bot-Db-lTD3t.js";import{R as W}from"./refresh-cw-CGiO1II2.js";import"./preload-helper-Dp1pzeXC.js";import"./useQuery-Cn4E8PqL.js";const M=6e4,K=5*6e4;function C(){var a;const t=D(()=>G(),M),r=D(()=>H(),K),O=()=>{t.refresh(),r.refresh()},n=t.data;return e.jsx(F,{title:"Agent pool",icon:P,actions:e.jsx("button",{type:"button",onClick:O,"aria-label":"Refresh agent status",className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:e.jsx(W,{className:A("h-3 w-3",(t.loading||r.loading)&&"animate-spin")})}),bodyClassName:"overflow-auto p-4",children:t.error&&!n?e.jsx("p",{className:"py-6 text-center text-sm text-destructive",children:"Couldn’t load agents."}):n?e.jsxs("div",{className:"space-y-3",children:[e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx("span",{"aria-hidden":!0,className:A("mt-1 h-2 w-2 shrink-0 rounded-full",r.data?r.data.ok?"bg-emerald-500":"bg-destructive":"bg-muted-foreground/40")}),e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("span",{className:"block truncate text-sm font-semibold",children:n.primary.name||"Primary agent"}),e.jsxs("span",{className:"block truncate text-[11px] text-muted-foreground",children:[k[n.cli],!((a=r.data)===null||a===void 0)&&a.model?` · ${r.data.model}`:""]})]})]}),e.jsx("p",{className:"text-[11px] text-muted-foreground",children:n.primary.heartbeatEnabled?`Heartbeat every ${n.primary.heartbeatIntervalH}h${n.primary.lastHeartbeatAt?` · last ${S(n.primary.lastHeartbeatAt)}`:""}`:"Heartbeat off"}),e.jsxs("div",{children:[e.jsxs("span",{className:"text-[10px] font-medium uppercase tracking-wider text-muted-foreground",children:["Sub-agents (",n.subAgents.length,")"]}),n.subAgents.length===0?e.jsx("p",{className:"mt-1 text-[11px] text-muted-foreground",children:"None configured."}):e.jsx("ul",{className:"mt-1 space-y-1",children:n.subAgents.map(d=>e.jsxs("li",{className:"flex items-center justify-between gap-2 text-[11px]",children:[e.jsx("span",{className:"truncate font-medium",children:d.name||"Unnamed"}),d.role&&e.jsx("span",{className:"shrink-0 truncate text-muted-foreground",children:d.role})]},d.id))})]})]}):e.jsx(R,{})})}C.__docgenInfo={description:"",methods:[],displayName:"AgentsWidget"};var l,m,p,u,g,h,f,v,x,_,b,y,N,w,T;const{expect:s,within:B}=__STORYBOOK_MODULE_TEST__,E={cli:"claude",primary:{name:"Orchestrator",description:"The single orchestrator agent.",heartbeatEnabled:!0,heartbeatPrompt:"Check the board and pick up ready work.",heartbeatIntervalH:6,lastHeartbeatAt:"2026-06-23T08:00:00.000Z",updatedAt:"2026-06-23T08:00:00.000Z"},subAgents:[{id:"sa1",name:"Reviewer",role:"Code review",description:"Reviews diffs before merge.",createdAt:"2026-06-20T09:00:00.000Z",updatedAt:"2026-06-20T09:00:00.000Z"}]},L={ok:!0,cli:"claude",model:"claude-opus-4-8",reply:"pong"},te={title:"Widgets/AgentsWidget",component:C,decorators:[a=>e.jsx("div",{className:"h-80 w-80",children:e.jsx(a,{})})]},I={match:"/agents/ping",json:L},o={beforeEach:()=>j([I,{match:"/agents",json:{config:E}}]),play:async({canvasElement:a})=>{const t=B(a);await s(await t.findByText("Orchestrator")).toBeInTheDocument(),await s(t.getByText("Reviewer")).toBeInTheDocument(),await s(t.getByText(/Heartbeat every 6h/)).toBeInTheDocument()}},i={beforeEach:()=>j([I,{match:"/agents",json:{config:{...E,primary:{...E.primary,heartbeatEnabled:!1},subAgents:[]}}}]),play:async({canvasElement:a})=>{const t=B(a);await s(await t.findByText("Heartbeat off")).toBeInTheDocument(),await s(t.getByText("None configured.")).toBeInTheDocument()}},c={beforeEach:()=>j([I,{match:"/agents",status:500}]),play:async({canvasElement:a})=>{const t=B(a);await s(await t.findByText("Couldn’t load agents.")).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(l=o.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
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
}`,...(p=o.parameters)===null||p===void 0||(m=p.docs)===null||m===void 0?void 0:m.source},description:{story:"Config + a healthy ping loaded from the gateway.",...(g=o.parameters)===null||g===void 0||(u=g.docs)===null||u===void 0?void 0:u.description}}};i.parameters={...i.parameters,docs:{...(h=i.parameters)===null||h===void 0?void 0:h.docs,source:{originalSource:`{
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
}`,...(v=i.parameters)===null||v===void 0||(f=v.docs)===null||f===void 0?void 0:f.source},description:{story:"No sub-agents and heartbeat off → the inert-state copy.",...(_=i.parameters)===null||_===void 0||(x=_.docs)===null||x===void 0?void 0:x.description}}};c.parameters={...c.parameters,docs:{...(b=c.parameters)===null||b===void 0?void 0:b.docs,source:{originalSource:`{
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
}`,...(N=c.parameters)===null||N===void 0||(y=N.docs)===null||y===void 0?void 0:y.source},description:{story:"Gateway `/agents` fails → the error fallback.",...(T=c.parameters)===null||T===void 0||(w=T.docs)===null||w===void 0?void 0:w.description}}};const ae=["Default","NoSubAgents","Error"];export{o as Default,c as Error,i as NoSubAgents,ae as __namedExportsOrder,te as default};
