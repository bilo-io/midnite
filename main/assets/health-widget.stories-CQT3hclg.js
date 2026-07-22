import{aL as L,aX as a,A as M,a as U,aJ as C}from"./iframe-B6JycjIP.js";import{i as k}from"./mock-fetch-aFrr3kfG.js";import{E as F,z as O,x as W}from"./api-Mo0ti7FN.js";import{u as m}from"./use-polling-4O-BWcvo.js";import{W as P}from"./widget-card-DIUoYQhe.js";import{R as q}from"./refresh-cw-CC8gOmAn.js";import"./preload-helper-Dp1pzeXC.js";import"./useQuery-Pyhd4hZK.js";/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z=[["path",{d:"M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5",key:"mvr1a0"}],["path",{d:"M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27",key:"auskq0"}]],J=L("heart-pulse",z),K=3e4,H=2*6e4;function N(){var t,e;const n=m(o=>F(o),K),l=m(()=>O(),H),r=m(()=>W(),H),E=((t=n.data)===null||t===void 0?void 0:t.ok)===!0&&!n.error,I=(e=r.data)===null||e===void 0?void 0:e.cli,B=l.loading&&!l.data,R=o=>{var s;return(s=l.data)===null||s===void 0?void 0:s.find(d=>d.cli===o)},A=()=>{n.refresh(),l.refresh(),r.refresh()};return a.jsxs(P,{title:"System health",icon:J,actions:a.jsx("button",{type:"button",onClick:A,"aria-label":"Re-check health",className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:a.jsx(q,{className:C("h-3 w-3",(n.loading||l.loading||r.loading)&&"animate-spin")})}),bodyClassName:"flex flex-col gap-2.5 overflow-auto p-4",children:[a.jsx(j,{label:"Gateway",ok:n.loading&&!n.data?null:E,detail:E?"Reachable":n.loading&&!n.data?"Checking…":"Unreachable"}),M.map(o=>{const s=R(o),d=o===I;var u;return a.jsx(j,{label:U[o],active:d,ok:B||!s?null:s.installed?!0:d?!1:null,detail:B?"Checking…":s?s.installed?(u=s.version)!==null&&u!==void 0?u:"Installed":"Not installed":"Unknown"},o)})]})}function j({label:t,ok:e,detail:n,active:l=!1}){const r=e===null?"hsl(var(--muted-foreground) / 0.4)":e?"rgb(16 185 129 / 0.7)":"hsl(var(--destructive) / 0.7)";return a.jsxs("div",{className:"flex items-center gap-2.5",children:[a.jsx("span",{"aria-hidden":!0,style:{"--glow-color":r},className:C("status-dot-glow h-2.5 w-2.5 shrink-0 rounded-full",e===null?"bg-muted-foreground/40":e?"bg-emerald-500":"bg-destructive")}),a.jsx("span",{className:"text-sm font-medium",children:t}),l&&a.jsx("span",{className:"rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground",children:"active"}),a.jsx("span",{className:"ml-auto truncate pl-2 text-[11px] text-muted-foreground",children:n})]})}N.__docgenInfo={description:"",methods:[],displayName:"HealthWidget"};var p,v,g,f,_,w,y,x,b,T;const{expect:h,within:G}=__STORYBOOK_MODULE_TEST__,S={match:"/agents/cli/statuses",json:{statuses:[{cli:"claude",installed:!0,version:"1.2.3"},{cli:"gemini",installed:!1},{cli:"codex",installed:!1},{cli:"opencode",installed:!1},{cli:"aider",installed:!0,version:"0.5.0"}]}},D={match:"/agents",json:{config:{cli:"claude",primary:{name:"Orchestrator",description:"Plans and dispatches work.",heartbeatEnabled:!1,heartbeatPrompt:"",heartbeatIntervalH:24,updatedAt:"2026-06-21T09:00:00.000Z"},subAgents:[]}}},te={title:"Widgets/HealthWidget",component:N,decorators:[t=>a.jsx("div",{className:"h-72 w-80",children:a.jsx(t,{})})]},i={beforeEach:()=>k([{match:"/health",json:{ok:!0}},S,D]),play:async({canvasElement:t})=>{const e=G(t);await h(await e.findByText("Reachable")).toBeInTheDocument(),await h(e.getByText("active")).toBeInTheDocument(),await h(e.getAllByText("Not installed").length).toBeGreaterThan(0)}},c={beforeEach:()=>k([{match:"/health",status:503},S,D]),play:async({canvasElement:t})=>{const e=G(t);await h(await e.findByText("Unreachable")).toBeInTheDocument()}};i.parameters={...i.parameters,docs:{...(p=i.parameters)===null||p===void 0?void 0:p.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/health',
    json: {
      ok: true
    }
  }, cliStatuses, agentsConfig]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Reachable')).toBeInTheDocument();
    // The active-CLI badge + a not-installed row both render from the registry.
    await expect(canvas.getByText('active')).toBeInTheDocument();
    await expect(canvas.getAllByText('Not installed').length).toBeGreaterThan(0);
  }
}`,...(g=i.parameters)===null||g===void 0||(v=g.docs)===null||v===void 0?void 0:v.source},description:{story:"Gateway reachable, Claude installed + active, the rest not set up.",...(_=i.parameters)===null||_===void 0||(f=_.docs)===null||f===void 0?void 0:f.description}}};c.parameters={...c.parameters,docs:{...(w=c.parameters)===null||w===void 0?void 0:w.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/health',
    status: 503
  }, cliStatuses, agentsConfig]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Unreachable')).toBeInTheDocument();
  }
}`,...(x=c.parameters)===null||x===void 0||(y=x.docs)===null||y===void 0?void 0:y.source},description:{story:"Gateway probe fails → the Gateway row goes red/Unreachable.",...(T=c.parameters)===null||T===void 0||(b=T.docs)===null||b===void 0?void 0:b.description}}};const ne=["Healthy","GatewayDown"];export{c as GatewayDown,i as Healthy,ne as __namedExportsOrder,te as default};
