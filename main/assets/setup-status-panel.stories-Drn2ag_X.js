import{b2 as r,aU as e}from"./iframe-C8Cqg7xG.js";import{i as S}from"./mock-fetch-aFrr3kfG.js";import{l as Y}from"./index-CnIkmlyd.js";import{s as F}from"./index-C4Gzk4TR.js";import{U}from"./api-g36KViNl.js";import{S as m,a as G}from"./setup-items-CWFO484N.js";import{n as C}from"./index-DcZQg3D3.js";import{R as L}from"./refresh-cw-d-wQHsvC.js";import{L as H}from"./loader-circle-DHT8cLTy.js";import{C as K}from"./check-B96r-t8c.js";import{A as q}from"./arrow-up-right-W-ybs9L1.js";import{S as z}from"./shield-check-CJPpS4Go.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-DQsFRFld.js";import"./chevron-down-C3Uv438n.js";function J(t){return t.items.some(a=>a.state==="missing")?"missing":t.items.some(a=>a.state==="warn")?"warn":"ok"}function M(){const t=C("settings"),a=C("common"),[n,O]=r.useState(null),[j,B]=r.useState(!0),[I,A]=r.useState(!1),o=r.useCallback(()=>{B(!0),U().then(s=>{O(s),A(!1)}).catch(()=>A(!0)).finally(()=>B(!1))},[]);r.useEffect(()=>(o(),window.addEventListener("focus",o),()=>window.removeEventListener("focus",o)),[o]);const P=n?e.jsxs("span",{className:"inline-flex items-center gap-1.5 text-xs font-medium",children:[e.jsx("span",{className:"h-2 w-2 rounded-full",style:{background:n.ready?m.ok:m[J(n)]},"aria-hidden":!0}),n.ready?t("system.setup.ready"):t("system.setup.incomplete")]}):null;return e.jsx(F,{title:t("system.setup.title"),icon:e.jsx(z,{className:"h-3.5 w-3.5"}),action:P,defaultOpen:!0,children:e.jsxs("div",{className:"space-y-4 p-5",children:[e.jsx("p",{className:"text-xs text-muted-foreground",children:t("system.setup.description")}),I?e.jsxs("div",{className:"flex items-center justify-between gap-4 text-xs text-muted-foreground",children:[e.jsx("span",{children:t("system.setup.loadError")}),e.jsxs("button",{type:"button",onClick:o,className:"inline-flex items-center gap-1 rounded-md text-muted-foreground hover:text-foreground",children:[e.jsx(L,{className:"h-3 w-3"})," ",a("retry")]})]}):n?e.jsx("ul",{className:"space-y-3",children:n.items.map(s=>{const D=s.state==="ok";return e.jsxs("li",{className:"flex items-start justify-between gap-4",children:[e.jsxs("div",{className:"flex items-start gap-2.5",children:[D?e.jsx(K,{className:"mt-0.5 h-4 w-4 shrink-0",style:{color:m.ok},"aria-hidden":!0}):e.jsx("span",{className:"mt-1.5 h-2 w-2 shrink-0 rounded-full",style:{background:m[s.state]},"aria-hidden":!0}),e.jsxs("div",{className:"space-y-0.5",children:[e.jsx("p",{className:"text-sm font-medium leading-none",children:s.label}),s.detail?e.jsx("p",{className:"text-xs text-muted-foreground",children:s.detail}):null]})]}),e.jsxs(Y,{href:G[s.id],className:"inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground",children:[t(D?"system.setup.manage":"system.setup.fix"),e.jsx(q,{className:"h-3 w-3"})]})]},s.id)})}):e.jsxs("div",{className:"flex items-center gap-1.5 text-xs text-muted-foreground",children:[e.jsx(H,{className:"h-3.5 w-3.5 animate-spin"})," ",t("system.setup.checking")]}),n&&!I?e.jsxs("button",{type:"button",onClick:o,disabled:j,className:"inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50",children:[e.jsx(L,{className:j?"h-3 w-3 animate-spin":"h-3 w-3"})," ",t("system.setup.recheck")]}):null]})})}M.__docgenInfo={description:`Ongoing setup-readiness panel (Phase 19 Theme D). Renders the same
\`SetupStatus\` checklist as the first-run nudge (Theme C) as a permanent view
in Settings → System, with a deep-link per item. Reuses Theme A's endpoint —
the single source of truth for "are we set up" — and re-checks on focus so a
setup that breaks later (a revoked key, an uninstalled CLI) turns amber/red
here without a reload.`,methods:[],displayName:"SetupStatusPanel"};var u,p,h,y,x,f,v,g,_,w,E,k,N,R,b;const{expect:d,within:T}=__STORYBOOK_MODULE_TEST__,Q={ready:!1,items:[{id:"provider",label:"LLM provider",state:"missing",detail:"No provider has an API key."},{id:"secret-key",label:"Secret key",state:"missing",detail:"MIDNITE_SECRET_KEY not set."},{id:"agent-cli",label:"Agent CLI",state:"ok",detail:"claude 1.2.3 on PATH"},{id:"agent-pool",label:"Agent pool",state:"warn",detail:"Autonomous scheduling off."},{id:"repo",label:"Repository",state:"warn",detail:"No repos registered yet (optional)."}]},V={ready:!0,items:[{id:"provider",label:"LLM provider",state:"ok",detail:"anthropic ready"},{id:"secret-key",label:"Secret key",state:"ok",detail:"MIDNITE_SECRET_KEY set"},{id:"agent-cli",label:"Agent CLI",state:"ok",detail:"claude 1.2.3 on PATH"},{id:"agent-pool",label:"Agent pool",state:"ok",detail:"4 slots, autonomous scheduling on"},{id:"repo",label:"Repository",state:"ok",detail:"1 registered"}]},me={title:"Components/SetupStatusPanel",component:M,decorators:[t=>e.jsx("div",{className:"max-w-2xl p-4",children:e.jsx(t,{})})]},i={beforeEach:()=>S([{match:"/setup/status",json:Q}]),play:async({canvasElement:t})=>{const a=T(t);await d(await a.findByText("Setup incomplete")).toBeInTheDocument(),await d(a.getAllByRole("link",{name:/fix/i}).length).toBeGreaterThan(0),await d(a.getByRole("link",{name:/manage/i})).toBeInTheDocument()}},l={beforeEach:()=>S([{match:"/setup/status",json:V}]),play:async({canvasElement:t})=>{const a=T(t);await d(await a.findByText("Ready")).toBeInTheDocument()}},c={beforeEach:()=>S([{match:"/setup/status",status:500}]),play:async({canvasElement:t})=>{const a=T(t);await d(await a.findByText(/couldn.t load setup status/i)).toBeInTheDocument()}};i.parameters={...i.parameters,docs:{...(u=i.parameters)===null||u===void 0?void 0:u.docs,source:{originalSource:`{
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
}`,...(h=i.parameters)===null||h===void 0||(p=h.docs)===null||p===void 0?void 0:p.source},description:{story:"Setup incomplete — blockers + recommendations, each deep-linked.",...(x=i.parameters)===null||x===void 0||(y=x.docs)===null||y===void 0?void 0:y.description}}};l.parameters={...l.parameters,docs:{...(f=l.parameters)===null||f===void 0?void 0:f.docs,source:{originalSource:`{
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
}`,...(g=l.parameters)===null||g===void 0||(v=g.docs)===null||v===void 0?void 0:v.source},description:{story:"Fully set up.",...(w=l.parameters)===null||w===void 0||(_=w.docs)===null||_===void 0?void 0:_.description}}};c.parameters={...c.parameters,docs:{...(E=c.parameters)===null||E===void 0?void 0:E.docs,source:{originalSource:`{
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
}`,...(N=c.parameters)===null||N===void 0||(k=N.docs)===null||k===void 0?void 0:k.source},description:{story:"Gateway unreachable → an inline retry.",...(b=c.parameters)===null||b===void 0||(R=b.docs)===null||R===void 0?void 0:R.description}}};const ue=["NotReady","Ready","Error"];export{c as Error,i as NotReady,l as Ready,ue as __namedExportsOrder,me as default};
