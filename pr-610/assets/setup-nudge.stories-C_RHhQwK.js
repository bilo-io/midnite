import{aO as X,b2 as D,bb as o,bu as J,a$ as e,aF as Q}from"./iframe-DA-MmuZw.js";import{i as L}from"./mock-fetch-aFrr3kfG.js";import{l as Y}from"./index-CPkh6UQJ.js";import{h as F}from"./index-tYTLESo8.js";import{V as Z}from"./api-CbRpmCQt.js";import{a as q,S as H}from"./setup-items-CWFO484N.js";import{R as ee}from"./rocket-BqJBoI9W.js";import{C as te}from"./check-DkS9Xb5l.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-BVAl8g99.js";import"./chevron-down-BOx3_HW8.js";/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const se=[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]],z=X("arrow-right",se);function ae(){const s=D("setup");return o.useMemo(()=>t=>{const n=`items.${t.id}.label`;return s.has(n)?s(n):t.label},[s])}const K="midnite.setup-nudge.dismissed";function U({onOpenWizard:s}){const t=D("setup"),n=D("common"),C=ae(),h=J(),[i,O]=o.useState(null),[$,g]=o.useState(!0);o.useEffect(()=>{try{g(sessionStorage.getItem(K)==="true")}catch{g(!1)}},[]);const c=o.useCallback(()=>{Z().then(O).catch(()=>O(null))},[]);o.useEffect(()=>(c(),window.addEventListener("focus",c),()=>window.removeEventListener("focus",c)),[c]);const G=()=>{g(!0);try{sessionStorage.setItem(K,"true")}catch{}};if(!i||i.ready||$||h!=null&&h.startsWith("/settings"))return null;const y=i.items.filter(a=>a.state==="missing");var f;const m=(f=y[0])!==null&&f!==void 0?f:i.items.find(a=>a.state!=="ok"),V=m?q[m.id]:"/settings";return e.jsxs("div",{role:"region","aria-label":t("nudge.title"),className:"animate-dialog-in fixed bottom-4 right-4 z-40 w-[calc(100%-2rem)] max-w-sm rounded-xl border border-border bg-card p-4 shadow-2xl",children:[e.jsxs("div",{className:"flex items-start gap-3",children:[e.jsx("span",{className:"mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground",children:e.jsx(ee,{className:"h-4 w-4"})}),e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("h2",{className:"text-sm font-semibold leading-snug",children:t("nudge.title")}),e.jsx("p",{className:"mt-0.5 text-xs text-muted-foreground",children:y.length>0?t("nudge.stepsLeft",{count:y.length}):t("nudge.recommendedRemain")})]}),e.jsx("button",{type:"button",onClick:G,"aria-label":n("chrome.dismiss"),className:"-mr-1 -mt-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",children:e.jsx(Q,{className:"h-4 w-4"})})]}),e.jsx("ul",{className:"mt-3 space-y-1",children:i.items.map(a=>{const u=a.state==="ok",P=e.jsxs("span",{className:"flex items-center gap-2 text-xs",children:[u?e.jsx(te,{className:"h-3.5 w-3.5 shrink-0",style:{color:H.ok}}):e.jsx("span",{className:"h-1.5 w-1.5 shrink-0 rounded-full",style:{background:H[a.state]},"aria-hidden":!0}),e.jsx("span",{className:u?"text-muted-foreground line-through":"font-medium",children:C(a)}),!u&&a.detail?e.jsxs("span",{className:"truncate text-muted-foreground",children:["— ",a.detail]}):null]});return e.jsx("li",{children:u?e.jsx("span",{className:"block py-0.5",children:P}):e.jsx(Y,{href:q[a.id],className:"block rounded-md py-0.5 transition-colors hover:text-foreground",children:P})},a.id)})}),e.jsx("div",{className:"mt-3 flex justify-end",children:s?e.jsxs("button",{type:"button",onClick:s,className:F({variant:"default",size:"sm"}),children:[t("nudge.openWizard")," ",e.jsx(z,{className:"ml-1 h-3.5 w-3.5"})]}):e.jsxs(Y,{href:V,className:F({variant:"default",size:"sm"}),children:[m?t("nudge.setUpItem",{label:C(m)}):t("nudge.openSettings"),e.jsx(z,{className:"ml-1 h-3.5 w-3.5"})]})})]})}U.__docgenInfo={description:`A soft, dismissible first-run nudge (Phase 19 Theme C). When the install isn't
\`ready\` it floats a compact readiness checklist with deep-links into settings.
It **never blocks the board** (Decision §2) — it's a corner card, hidden on the
settings routes (the ongoing Status panel, Theme D, owns the in-settings view),
and dismissible for the session. Rendered once in the main layout so it covers
every primary surface.`,methods:[],displayName:"SetupNudge",props:{onOpenWizard:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};var v,x,_,b,w,R,N,k,E,j,T,S,A,I,B;const{expect:p,within:M}=__STORYBOOK_MODULE_TEST__,ne={ready:!1,items:[{id:"provider",label:"LLM provider",state:"missing",detail:"No provider has an API key."},{id:"secret-key",label:"Secret key",state:"missing",detail:"MIDNITE_SECRET_KEY not set."},{id:"agent-cli",label:"Agent CLI",state:"ok",detail:"claude 1.2.3 on PATH"},{id:"agent-pool",label:"Agent pool",state:"warn",detail:"Autonomous scheduling off."},{id:"repo",label:"Repository",state:"warn",detail:"No repos registered yet (optional)."}]},W={ready:!1,items:[{id:"provider",label:"LLM provider",state:"ok",detail:"anthropic ready"},{id:"secret-key",label:"Secret key",state:"ok",detail:"MIDNITE_SECRET_KEY set"},{id:"agent-cli",label:"Agent CLI",state:"ok",detail:"claude 1.2.3 on PATH"},{id:"agent-pool",label:"Agent pool",state:"warn",detail:"Autonomous scheduling off."},{id:"repo",label:"Repository",state:"warn",detail:"No repos registered yet (optional)."}]},oe={ready:!0,items:W.items.map(s=>({...s,state:"ok"}))},fe={title:"Components/SetupNudge",component:U,parameters:{layout:"fullscreen"},decorators:[s=>e.jsx("div",{className:"relative h-96 w-full bg-background",children:e.jsx(s,{})})]},r={beforeEach:()=>L([{match:"/setup/status",json:ne}]),play:async({canvasElement:s})=>{const t=M(s);await t.findByRole("region",{name:/finish setting up midnite/i}),await p(t.getByText("2 steps left before agents can run.")).toBeInTheDocument(),await p(t.getByRole("link",{name:/set up llm provider/i})).toHaveAttribute("href","/settings/agents")}},d={beforeEach:()=>L([{match:"/setup/status",json:W}]),play:async({canvasElement:s})=>{const t=M(s);await t.findByRole("region",{name:/finish setting up midnite/i}),await p(t.getByText("A couple of recommended steps remain.")).toBeInTheDocument()}},l={beforeEach:()=>L([{match:"/setup/status",json:oe}]),play:async({canvasElement:s})=>{const t=M(s);await new Promise(n=>setTimeout(n,50)),await p(t.queryByRole("region",{name:/finish setting up/i})).toBeNull()}};r.parameters={...r.parameters,docs:{...(v=r.parameters)===null||v===void 0?void 0:v.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/setup/status',
    json: NOT_READY
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole('region', {
      name: /finish setting up midnite/i
    });
    await expect(canvas.getByText('2 steps left before agents can run.')).toBeInTheDocument();
    await expect(canvas.getByRole('link', {
      name: /set up llm provider/i
    })).toHaveAttribute('href', '/settings/agents');
  }
}`,...(_=r.parameters)===null||_===void 0||(x=_.docs)===null||x===void 0?void 0:x.source},description:{story:"Two required steps outstanding → the soft nudge with a primary CTA.",...(w=r.parameters)===null||w===void 0||(b=w.docs)===null||b===void 0?void 0:b.description}}};d.parameters={...d.parameters,docs:{...(R=d.parameters)===null||R===void 0?void 0:R.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/setup/status',
    json: ALMOST
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole('region', {
      name: /finish setting up midnite/i
    });
    await expect(canvas.getByText('A couple of recommended steps remain.')).toBeInTheDocument();
  }
}`,...(k=d.parameters)===null||k===void 0||(N=k.docs)===null||N===void 0?void 0:N.source},description:{story:"Required steps done, recommendations remain → softer copy.",...(j=d.parameters)===null||j===void 0||(E=j.docs)===null||E===void 0?void 0:E.description}}};l.parameters={...l.parameters,docs:{...(T=l.parameters)===null||T===void 0?void 0:T.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/setup/status',
    json: READY
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    // Give the fetch a tick, then assert the nudge never mounts.
    await new Promise(r => setTimeout(r, 50));
    await expect(canvas.queryByRole('region', {
      name: /finish setting up/i
    })).toBeNull();
  }
}`,...(A=l.parameters)===null||A===void 0||(S=A.docs)===null||S===void 0?void 0:S.source},description:{story:"Fully ready → the nudge stays out of the way entirely.",...(B=l.parameters)===null||B===void 0||(I=B.docs)===null||I===void 0?void 0:I.description}}};const ve=["NotReady","AlmostReady","Ready"];export{d as AlmostReady,r as NotReady,l as Ready,ve as __namedExportsOrder,fe as default};
