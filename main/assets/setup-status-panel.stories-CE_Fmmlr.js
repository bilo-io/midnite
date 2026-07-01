import{h as M,r as o,n as e}from"./iframe-DJr7qVNo.js";import{i as S}from"./mock-fetch-aFrr3kfG.js";import{l as O}from"./index-C2gaUvt5.js";import{y as P}from"./index-Dl4JnYVx.js";import{B as F}from"./api-A95bhGP6.js";import{S as d,a as Y}from"./setup-items-CWFO484N.js";import{R as A}from"./refresh-cw-DUQe2k9R.js";import{L as U}from"./loader-circle-CNyT3gS4.js";import{C as G}from"./check-Dt-62BLG.js";import{A as H}from"./arrow-up-right-pQcW7DOn.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-bZvbO2wZ.js";import"./inbound-CbJZzwyX.js";/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K=[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]],z=M("shield-check",K);function V(t){return t.items.some(a=>a.state==="missing")?"missing":t.items.some(a=>a.state==="warn")?"warn":"ok"}function D(){const[t,a]=o.useState(null),[b,j]=o.useState(!0),[B,I]=o.useState(!1),n=o.useCallback(()=>{j(!0),F().then(s=>{a(s),I(!1)}).catch(()=>I(!0)).finally(()=>j(!1))},[]);o.useEffect(()=>(n(),window.addEventListener("focus",n),()=>window.removeEventListener("focus",n)),[n]);const L=t?e.jsxs("span",{className:"inline-flex items-center gap-1.5 text-xs font-medium",children:[e.jsx("span",{className:"h-2 w-2 rounded-full",style:{background:t.ready?d.ok:d[V(t)]},"aria-hidden":!0}),t.ready?"Ready":"Setup incomplete"]}):null;return e.jsx(P,{title:"Setup readiness",icon:e.jsx(z,{className:"h-3.5 w-3.5"}),action:L,defaultOpen:!0,children:e.jsxs("div",{className:"space-y-4 p-5",children:[e.jsx("p",{className:"text-xs text-muted-foreground",children:"Whether this install can run agents — live provider, secret-key, agent-CLI, pool and repo state. The same checklist drives the first-run prompt."}),B?e.jsxs("div",{className:"flex items-center justify-between gap-4 text-xs text-muted-foreground",children:[e.jsx("span",{children:"Couldn’t load setup status — is the gateway running?"}),e.jsxs("button",{type:"button",onClick:n,className:"inline-flex items-center gap-1 rounded-md text-muted-foreground hover:text-foreground",children:[e.jsx(A,{className:"h-3 w-3"})," Retry"]})]}):t?e.jsx("ul",{className:"space-y-3",children:t.items.map(s=>{const C=s.state==="ok";return e.jsxs("li",{className:"flex items-start justify-between gap-4",children:[e.jsxs("div",{className:"flex items-start gap-2.5",children:[C?e.jsx(G,{className:"mt-0.5 h-4 w-4 shrink-0",style:{color:d.ok},"aria-hidden":!0}):e.jsx("span",{className:"mt-1.5 h-2 w-2 shrink-0 rounded-full",style:{background:d[s.state]},"aria-hidden":!0}),e.jsxs("div",{className:"space-y-0.5",children:[e.jsx("p",{className:"text-sm font-medium leading-none",children:s.label}),s.detail?e.jsx("p",{className:"text-xs text-muted-foreground",children:s.detail}):null]})]}),e.jsxs(O,{href:Y[s.id],className:"inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground",children:[C?"Manage":"Fix",e.jsx(H,{className:"h-3 w-3"})]})]},s.id)})}):e.jsxs("div",{className:"flex items-center gap-1.5 text-xs text-muted-foreground",children:[e.jsx(U,{className:"h-3.5 w-3.5 animate-spin"})," checking…"]}),t&&!B?e.jsxs("button",{type:"button",onClick:n,disabled:b,className:"inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50",children:[e.jsx(A,{className:b?"h-3 w-3 animate-spin":"h-3 w-3"})," Re-check"]}):null]})})}D.__docgenInfo={description:`Ongoing setup-readiness panel (Phase 19 Theme D). Renders the same
\`SetupStatus\` checklist as the first-run nudge (Theme C) as a permanent view
in Settings → System, with a deep-link per item. Reuses Theme A's endpoint —
the single source of truth for "are we set up" — and re-checks on focus so a
setup that breaks later (a revoked key, an uninstalled CLI) turns amber/red
here without a reload.`,methods:[],displayName:"SetupStatusPanel"};var m,u,p,h,x,y,f,v,g,_,k,w,E,R,N;const{expect:c,within:T}=__STORYBOOK_MODULE_TEST__,W={ready:!1,items:[{id:"provider",label:"LLM provider",state:"missing",detail:"No provider has an API key."},{id:"secret-key",label:"Secret key",state:"missing",detail:"MIDNITE_SECRET_KEY not set."},{id:"agent-cli",label:"Agent CLI",state:"ok",detail:"claude 1.2.3 on PATH"},{id:"agent-pool",label:"Agent pool",state:"warn",detail:"Autonomous scheduling off."},{id:"repo",label:"Repository",state:"warn",detail:"No repos registered yet (optional)."}]},q={ready:!0,items:[{id:"provider",label:"LLM provider",state:"ok",detail:"anthropic ready"},{id:"secret-key",label:"Secret key",state:"ok",detail:"MIDNITE_SECRET_KEY set"},{id:"agent-cli",label:"Agent CLI",state:"ok",detail:"claude 1.2.3 on PATH"},{id:"agent-pool",label:"Agent pool",state:"ok",detail:"4 slots, autonomous scheduling on"},{id:"repo",label:"Repository",state:"ok",detail:"1 registered"}]},le={title:"Components/SetupStatusPanel",component:D,decorators:[t=>e.jsx("div",{className:"max-w-2xl p-4",children:e.jsx(t,{})})]},r={beforeEach:()=>S([{match:"/setup/status",json:W}]),play:async({canvasElement:t})=>{const a=T(t);await c(await a.findByText("Setup incomplete")).toBeInTheDocument(),await c(a.getAllByRole("link",{name:/fix/i}).length).toBeGreaterThan(0),await c(a.getByRole("link",{name:/manage/i})).toBeInTheDocument()}},i={beforeEach:()=>S([{match:"/setup/status",json:q}]),play:async({canvasElement:t})=>{const a=T(t);await c(await a.findByText("Ready")).toBeInTheDocument()}},l={beforeEach:()=>S([{match:"/setup/status",status:500}]),play:async({canvasElement:t})=>{const a=T(t);await c(await a.findByText(/couldn.t load setup status/i)).toBeInTheDocument()}};r.parameters={...r.parameters,docs:{...(m=r.parameters)===null||m===void 0?void 0:m.docs,source:{originalSource:`{
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
}`,...(p=r.parameters)===null||p===void 0||(u=p.docs)===null||u===void 0?void 0:u.source},description:{story:"Setup incomplete — blockers + recommendations, each deep-linked.",...(x=r.parameters)===null||x===void 0||(h=x.docs)===null||h===void 0?void 0:h.description}}};i.parameters={...i.parameters,docs:{...(y=i.parameters)===null||y===void 0?void 0:y.docs,source:{originalSource:`{
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
}`,...(v=i.parameters)===null||v===void 0||(f=v.docs)===null||f===void 0?void 0:f.source},description:{story:"Fully set up.",...(_=i.parameters)===null||_===void 0||(g=_.docs)===null||g===void 0?void 0:g.description}}};l.parameters={...l.parameters,docs:{...(k=l.parameters)===null||k===void 0?void 0:k.docs,source:{originalSource:`{
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
}`,...(E=l.parameters)===null||E===void 0||(w=E.docs)===null||w===void 0?void 0:w.source},description:{story:"Gateway unreachable → an inline retry.",...(N=l.parameters)===null||N===void 0||(R=N.docs)===null||R===void 0?void 0:R.description}}};const ce=["NotReady","Ready","Error"];export{l as Error,r as NotReady,i as Ready,ce as __namedExportsOrder,le as default};
