import{r,n as e}from"./iframe-D56zeehm.js";import{i as S}from"./mock-fetch-aFrr3kfG.js";import{l as M}from"./index-Csmsyqqs.js";import{y as O}from"./index-uldj7XQ-.js";import{C as P}from"./api-Cm_UA91W.js";import{S as c,a as F}from"./setup-items-CWFO484N.js";import{R as A}from"./refresh-cw-DtPORVOj.js";import{L as Y}from"./loader-circle-BIiUOGy3.js";import{C as U}from"./check-DrTJmGpT.js";import{A as G}from"./arrow-up-right-5_LcHmeo.js";import{S as H}from"./shield-check-VG_T3QCl.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-CMcnt6So.js";import"./inbound-DG44u6YS.js";function K(t){return t.items.some(a=>a.state==="missing")?"missing":t.items.some(a=>a.state==="warn")?"warn":"ok"}function D(){const[t,a]=r.useState(null),[b,j]=r.useState(!0),[B,I]=r.useState(!1),n=r.useCallback(()=>{j(!0),P().then(s=>{a(s),I(!1)}).catch(()=>I(!0)).finally(()=>j(!1))},[]);r.useEffect(()=>(n(),window.addEventListener("focus",n),()=>window.removeEventListener("focus",n)),[n]);const L=t?e.jsxs("span",{className:"inline-flex items-center gap-1.5 text-xs font-medium",children:[e.jsx("span",{className:"h-2 w-2 rounded-full",style:{background:t.ready?c.ok:c[K(t)]},"aria-hidden":!0}),t.ready?"Ready":"Setup incomplete"]}):null;return e.jsx(O,{title:"Setup readiness",icon:e.jsx(H,{className:"h-3.5 w-3.5"}),action:L,defaultOpen:!0,children:e.jsxs("div",{className:"space-y-4 p-5",children:[e.jsx("p",{className:"text-xs text-muted-foreground",children:"Whether this install can run agents — live provider, secret-key, agent-CLI, pool and repo state. The same checklist drives the first-run prompt."}),B?e.jsxs("div",{className:"flex items-center justify-between gap-4 text-xs text-muted-foreground",children:[e.jsx("span",{children:"Couldn’t load setup status — is the gateway running?"}),e.jsxs("button",{type:"button",onClick:n,className:"inline-flex items-center gap-1 rounded-md text-muted-foreground hover:text-foreground",children:[e.jsx(A,{className:"h-3 w-3"})," Retry"]})]}):t?e.jsx("ul",{className:"space-y-3",children:t.items.map(s=>{const C=s.state==="ok";return e.jsxs("li",{className:"flex items-start justify-between gap-4",children:[e.jsxs("div",{className:"flex items-start gap-2.5",children:[C?e.jsx(U,{className:"mt-0.5 h-4 w-4 shrink-0",style:{color:c.ok},"aria-hidden":!0}):e.jsx("span",{className:"mt-1.5 h-2 w-2 shrink-0 rounded-full",style:{background:c[s.state]},"aria-hidden":!0}),e.jsxs("div",{className:"space-y-0.5",children:[e.jsx("p",{className:"text-sm font-medium leading-none",children:s.label}),s.detail?e.jsx("p",{className:"text-xs text-muted-foreground",children:s.detail}):null]})]}),e.jsxs(M,{href:F[s.id],className:"inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground",children:[C?"Manage":"Fix",e.jsx(G,{className:"h-3 w-3"})]})]},s.id)})}):e.jsxs("div",{className:"flex items-center gap-1.5 text-xs text-muted-foreground",children:[e.jsx(Y,{className:"h-3.5 w-3.5 animate-spin"})," checking…"]}),t&&!B?e.jsxs("button",{type:"button",onClick:n,disabled:b,className:"inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50",children:[e.jsx(A,{className:b?"h-3 w-3 animate-spin":"h-3 w-3"})," Re-check"]}):null]})})}D.__docgenInfo={description:`Ongoing setup-readiness panel (Phase 19 Theme D). Renders the same
\`SetupStatus\` checklist as the first-run nudge (Theme C) as a permanent view
in Settings → System, with a deep-link per item. Reuses Theme A's endpoint —
the single source of truth for "are we set up" — and re-checks on focus so a
setup that breaks later (a revoked key, an uninstalled CLI) turns amber/red
here without a reload.`,methods:[],displayName:"SetupStatusPanel"};var m,u,p,h,x,y,f,v,g,_,w,k,E,R,N;const{expect:d,within:T}=__STORYBOOK_MODULE_TEST__,W={ready:!1,items:[{id:"provider",label:"LLM provider",state:"missing",detail:"No provider has an API key."},{id:"secret-key",label:"Secret key",state:"missing",detail:"MIDNITE_SECRET_KEY not set."},{id:"agent-cli",label:"Agent CLI",state:"ok",detail:"claude 1.2.3 on PATH"},{id:"agent-pool",label:"Agent pool",state:"warn",detail:"Autonomous scheduling off."},{id:"repo",label:"Repository",state:"warn",detail:"No repos registered yet (optional)."}]},q={ready:!0,items:[{id:"provider",label:"LLM provider",state:"ok",detail:"anthropic ready"},{id:"secret-key",label:"Secret key",state:"ok",detail:"MIDNITE_SECRET_KEY set"},{id:"agent-cli",label:"Agent CLI",state:"ok",detail:"claude 1.2.3 on PATH"},{id:"agent-pool",label:"Agent pool",state:"ok",detail:"4 slots, autonomous scheduling on"},{id:"repo",label:"Repository",state:"ok",detail:"1 registered"}]},ie={title:"Components/SetupStatusPanel",component:D,decorators:[t=>e.jsx("div",{className:"max-w-2xl p-4",children:e.jsx(t,{})})]},o={beforeEach:()=>S([{match:"/setup/status",json:W}]),play:async({canvasElement:t})=>{const a=T(t);await d(await a.findByText("Setup incomplete")).toBeInTheDocument(),await d(a.getAllByRole("link",{name:/fix/i}).length).toBeGreaterThan(0),await d(a.getByRole("link",{name:/manage/i})).toBeInTheDocument()}},i={beforeEach:()=>S([{match:"/setup/status",json:q}]),play:async({canvasElement:t})=>{const a=T(t);await d(await a.findByText("Ready")).toBeInTheDocument()}},l={beforeEach:()=>S([{match:"/setup/status",status:500}]),play:async({canvasElement:t})=>{const a=T(t);await d(await a.findByText(/couldn.t load setup status/i)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(m=o.parameters)===null||m===void 0?void 0:m.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/setup/status',
    json: NOT_READY
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Setup incomplete')).toBeInTheDocument();
    await expect(canvas.getAllByRole('link', {
      name: /fix/i
    }).length).toBeGreaterThan(0);
    await expect(canvas.getByRole('link', {
      name: /manage/i
    })).toBeInTheDocument();
  }
}`,...(p=o.parameters)===null||p===void 0||(u=p.docs)===null||u===void 0?void 0:u.source},description:{story:"Setup incomplete — blockers + recommendations, each deep-linked.",...(x=o.parameters)===null||x===void 0||(h=x.docs)===null||h===void 0?void 0:h.description}}};i.parameters={...i.parameters,docs:{...(y=i.parameters)===null||y===void 0?void 0:y.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/setup/status',
    json: READY
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Ready')).toBeInTheDocument();
  }
}`,...(v=i.parameters)===null||v===void 0||(f=v.docs)===null||f===void 0?void 0:f.source},description:{story:"Fully set up.",...(_=i.parameters)===null||_===void 0||(g=_.docs)===null||g===void 0?void 0:g.description}}};l.parameters={...l.parameters,docs:{...(w=l.parameters)===null||w===void 0?void 0:w.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/setup/status',
    status: 500
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/couldn.t load setup status/i)).toBeInTheDocument();
  }
}`,...(E=l.parameters)===null||E===void 0||(k=E.docs)===null||k===void 0?void 0:k.source},description:{story:"Gateway unreachable → an inline retry.",...(N=l.parameters)===null||N===void 0||(R=N.docs)===null||R===void 0?void 0:R.description}}};const le=["NotReady","Ready","Error"];export{l as Error,o as NotReady,i as Ready,le as __namedExportsOrder,ie as default};
