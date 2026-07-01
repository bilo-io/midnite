import{h as W,F as $,r as o,n as e,X as G}from"./iframe-Bv7TZnSa.js";import{i as B}from"./mock-fetch-aFrr3kfG.js";import{l as C}from"./index-8Wb0CsfS.js";import{W as L}from"./index-DK-uwmrl.js";import{B as X}from"./api-CHjHKUbu.js";import{a as O,S as F}from"./setup-items-CWFO484N.js";import{R as J}from"./rocket-BQJaeYBj.js";import{C as Q}from"./check-kIS44PmB.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-Cax_LvG-.js";import"./webhook-Cky58oAp.js";/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const V=[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]],P=W("arrow-right",V),Y="midnite.setup-nudge.dismissed";function q({onOpenWizard:s}){const a=$(),[n,D]=o.useState(null),[z,h]=o.useState(!0);o.useEffect(()=>{try{h(sessionStorage.getItem(Y)==="true")}catch{h(!1)}},[]);const l=o.useCallback(()=>{X().then(D).catch(()=>D(null))},[]);o.useEffect(()=>(l(),window.addEventListener("focus",l),()=>window.removeEventListener("focus",l)),[l]);const K=()=>{h(!0);try{sessionStorage.setItem(Y,"true")}catch{}};if(!n||n.ready||z||a!=null&&a.startsWith("/settings"))return null;const c=n.items.filter(t=>t.state==="missing");var g;const m=(g=c[0])!==null&&g!==void 0?g:n.items.find(t=>t.state!=="ok"),U=m?O[m.id]:"/settings";return e.jsxs("div",{role:"region","aria-label":"Finish setting up midnite",className:"animate-dialog-in fixed bottom-4 right-4 z-40 w-[calc(100%-2rem)] max-w-sm rounded-xl border border-border bg-card p-4 shadow-2xl",children:[e.jsxs("div",{className:"flex items-start gap-3",children:[e.jsx("span",{className:"mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground",children:e.jsx(J,{className:"h-4 w-4"})}),e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("h2",{className:"text-sm font-semibold leading-snug",children:"Finish setting up midnite"}),e.jsx("p",{className:"mt-0.5 text-xs text-muted-foreground",children:c.length>0?`${c.length} step${c.length===1?"":"s"} left before agents can run.`:"A couple of recommended steps remain."})]}),e.jsx("button",{type:"button",onClick:K,"aria-label":"Dismiss",className:"-mr-1 -mt-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",children:e.jsx(G,{className:"h-4 w-4"})})]}),e.jsx("ul",{className:"mt-3 space-y-1",children:n.items.map(t=>{const u=t.state==="ok",M=e.jsxs("span",{className:"flex items-center gap-2 text-xs",children:[u?e.jsx(Q,{className:"h-3.5 w-3.5 shrink-0",style:{color:F.ok}}):e.jsx("span",{className:"h-1.5 w-1.5 shrink-0 rounded-full",style:{background:F[t.state]},"aria-hidden":!0}),e.jsx("span",{className:u?"text-muted-foreground line-through":"font-medium",children:t.label}),!u&&t.detail?e.jsxs("span",{className:"truncate text-muted-foreground",children:["— ",t.detail]}):null]});return e.jsx("li",{children:u?e.jsx("span",{className:"block py-0.5",children:M}):e.jsx(C,{href:O[t.id],className:"block rounded-md py-0.5 transition-colors hover:text-foreground",children:M})},t.id)})}),e.jsx("div",{className:"mt-3 flex justify-end",children:s?e.jsxs("button",{type:"button",onClick:s,className:L({variant:"default",size:"sm"}),children:["Open setup wizard ",e.jsx(P,{className:"ml-1 h-3.5 w-3.5"})]}):e.jsxs(C,{href:U,className:L({variant:"default",size:"sm"}),children:[m?`Set up ${m.label}`:"Open settings",e.jsx(P,{className:"ml-1 h-3.5 w-3.5"})]})})]})}q.__docgenInfo={description:`A soft, dismissible first-run nudge (Phase 19 Theme C). When the install isn't
\`ready\` it floats a compact readiness checklist with deep-links into settings.
It **never blocks the board** (Decision §2) — it's a corner card, hidden on the
settings routes (the ongoing Status panel, Theme D, owns the in-settings view),
and dismissible for the session. Rendered once in the main layout so it covers
every primary surface.`,methods:[],displayName:"SetupNudge",props:{onOpenWizard:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};var y,f,v,x,_,w,b,R,N,k,E,j,T,A,S;const{expect:p,within:I}=__STORYBOOK_MODULE_TEST__,Z={ready:!1,items:[{id:"provider",label:"LLM provider",state:"missing",detail:"No provider has an API key."},{id:"secret-key",label:"Secret key",state:"missing",detail:"MIDNITE_SECRET_KEY not set."},{id:"agent-cli",label:"Agent CLI",state:"ok",detail:"claude 1.2.3 on PATH"},{id:"agent-pool",label:"Agent pool",state:"warn",detail:"Autonomous scheduling off."},{id:"repo",label:"Repository",state:"warn",detail:"No repos registered yet (optional)."}]},H={ready:!1,items:[{id:"provider",label:"LLM provider",state:"ok",detail:"anthropic ready"},{id:"secret-key",label:"Secret key",state:"ok",detail:"MIDNITE_SECRET_KEY set"},{id:"agent-cli",label:"Agent CLI",state:"ok",detail:"claude 1.2.3 on PATH"},{id:"agent-pool",label:"Agent pool",state:"warn",detail:"Autonomous scheduling off."},{id:"repo",label:"Repository",state:"warn",detail:"No repos registered yet (optional)."}]},ee={ready:!0,items:H.items.map(s=>({...s,state:"ok"}))},ue={title:"Components/SetupNudge",component:q,parameters:{layout:"fullscreen"},decorators:[s=>e.jsx("div",{className:"relative h-96 w-full bg-background",children:e.jsx(s,{})})]},i={beforeEach:()=>B([{match:"/setup/status",json:Z}]),play:async({canvasElement:s})=>{const a=I(s);await a.findByRole("region",{name:/finish setting up midnite/i}),await p(a.getByText("2 steps left before agents can run.")).toBeInTheDocument(),await p(a.getByRole("link",{name:/set up llm provider/i})).toHaveAttribute("href","/settings/agents")}},r={beforeEach:()=>B([{match:"/setup/status",json:H}]),play:async({canvasElement:s})=>{const a=I(s);await a.findByRole("region",{name:/finish setting up midnite/i}),await p(a.getByText("A couple of recommended steps remain.")).toBeInTheDocument()}},d={beforeEach:()=>B([{match:"/setup/status",json:ee}]),play:async({canvasElement:s})=>{const a=I(s);await new Promise(n=>setTimeout(n,50)),await p(a.queryByRole("region",{name:/finish setting up/i})).toBeNull()}};i.parameters={...i.parameters,docs:{...(y=i.parameters)===null||y===void 0?void 0:y.docs,source:{originalSource:`{
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
}`,...(v=i.parameters)===null||v===void 0||(f=v.docs)===null||f===void 0?void 0:f.source},description:{story:"Two required steps outstanding → the soft nudge with a primary CTA.",...(_=i.parameters)===null||_===void 0||(x=_.docs)===null||x===void 0?void 0:x.description}}};r.parameters={...r.parameters,docs:{...(w=r.parameters)===null||w===void 0?void 0:w.docs,source:{originalSource:`{
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
}`,...(R=r.parameters)===null||R===void 0||(b=R.docs)===null||b===void 0?void 0:b.source},description:{story:"Required steps done, recommendations remain → softer copy.",...(k=r.parameters)===null||k===void 0||(N=k.docs)===null||N===void 0?void 0:N.description}}};d.parameters={...d.parameters,docs:{...(E=d.parameters)===null||E===void 0?void 0:E.docs,source:{originalSource:`{
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
}`,...(T=d.parameters)===null||T===void 0||(j=T.docs)===null||j===void 0?void 0:j.source},description:{story:"Fully ready → the nudge stays out of the way entirely.",...(S=d.parameters)===null||S===void 0||(A=S.docs)===null||A===void 0?void 0:A.description}}};const pe=["NotReady","AlmostReady","Ready"];export{r as AlmostReady,i as NotReady,d as Ready,pe as __namedExportsOrder,ue as default};
