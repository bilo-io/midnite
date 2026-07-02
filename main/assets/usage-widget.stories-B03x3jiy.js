import{h as Y,n as e,f as O}from"./iframe-CKCsQZq4.js";import{i as m}from"./mock-fetch-aFrr3kfG.js";import{i as H,L as V}from"./inbound-CBNilj0T.js";import{E as Z}from"./api-x3f2lr37.js";import{u as q}from"./use-polling-C20hBCcn.js";import{W as G}from"./widget-card-CqHwEz3f.js";import{T as K}from"./triangle-alert-BatrypGD.js";import{R as z}from"./refresh-cw-EkBJnrz1.js";import"./preload-helper-Dp1pzeXC.js";import"./useQuery-ljOZEy5i.js";/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J=[["path",{d:"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",key:"18etb6"}],["path",{d:"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",key:"xoc0q4"}]],Q=Y("wallet",J),X=6e4,$=30;function ee(){const t=new Date;return t.setDate(t.getDate()-($-1)),t.setHours(0,0,0,0),t.toISOString()}function S(t){return t>0&&t<.01?"<$0.01":`$${t.toFixed(2)}`}function te(t,s){var a;if(s==="provider")return(a=H[t])!==null&&a!==void 0?a:t;var o;return(o=V[t])!==null&&o!==void 0?o:t}function W(){var t,s;const{data:a,error:o,loading:r,refresh:y}=q(()=>Z({from:ee(),groupBy:"day"}),X),F=a?a.byDay.reduce((n,P)=>Math.max(n,P.estCostUsd),0):0;return e.jsx(G,{title:"LLM cost & usage",icon:Q,actions:e.jsx("button",{type:"button",onClick:y,"aria-label":"Refresh usage",className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:e.jsx(z,{className:O("h-3 w-3",r&&"animate-spin")})}),bodyClassName:"flex flex-col gap-3 overflow-y-auto p-4",children:o&&!a?e.jsx("p",{className:"m-auto text-sm text-destructive",children:"Couldn’t load usage."}):!a&&r?e.jsx("p",{className:"m-auto text-sm text-muted-foreground",children:"Loading…"}):a?e.jsxs(e.Fragment,{children:[a.warnings.map(n=>e.jsxs("div",{className:O("flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-xs",n.exceeded?"border-destructive/40 bg-destructive/10 text-destructive":"border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"),children:[e.jsx(K,{className:"mt-0.5 h-3.5 w-3.5 shrink-0","aria-hidden":!0}),e.jsx("span",{children:n.message})]},n.period)),e.jsxs("div",{children:[e.jsx("span",{className:"text-3xl font-semibold tabular-nums leading-none",children:S(a.totals.estCostUsd)}),e.jsxs("span",{className:"ml-1.5 text-xs text-muted-foreground",children:["est. over ",$,"d · ",a.totals.calls," call",a.totals.calls===1?"":"s"]})]}),a.byDay.length>0&&e.jsxs("div",{children:[e.jsx("div",{className:"flex h-12 items-end gap-0.5","aria-hidden":!0,children:a.byDay.map(n=>e.jsx("div",{className:"flex-1 rounded-sm bg-primary/60",style:{height:`${F>0?Math.max(4,n.estCostUsd/F*100):4}%`},title:`${n.key}: ${S(n.estCostUsd)}`},n.key))}),e.jsxs("div",{className:"mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground",children:[e.jsx("span",{children:(t=a.byDay[0])===null||t===void 0?void 0:t.key.slice(5)}),e.jsx("span",{children:(s=a.byDay.at(-1))===null||s===void 0?void 0:s.key.slice(5)})]})]}),a.totals.calls===0?e.jsx("p",{className:"text-xs text-muted-foreground",children:"No LLM calls recorded yet. Spend appears here once the gateway’s AI features run."}):e.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[e.jsx(A,{title:"By provider",buckets:a.byProvider,axis:"provider"}),e.jsx(A,{title:"By feature",buckets:a.byFeature,axis:"feature"})]}),e.jsx("p",{className:"mt-auto text-[10px] text-muted-foreground",children:"Costs are estimates from a static price table."})]}):null})}function A({title:t,buckets:s,axis:a}){const o=[...s].sort((r,y)=>y.estCostUsd-r.estCostUsd).slice(0,5);return e.jsxs("div",{className:"min-w-0",children:[e.jsx("p",{className:"mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground",children:t}),e.jsx("ul",{className:"flex flex-col gap-1",children:o.length===0?e.jsx("li",{className:"text-xs text-muted-foreground",children:"—"}):o.map(r=>e.jsxs("li",{className:"flex items-center justify-between gap-2 text-xs",children:[e.jsx("span",{className:"truncate",children:te(r.key,a)}),e.jsx("span",{className:"shrink-0 tabular-nums text-muted-foreground",children:S(r.estCostUsd)})]},r.key))})]})}W.__docgenInfo={description:"",methods:[],displayName:"UsageWidget"};var v,x,h,g,f,_,b,T,k,w,B,j,E,D,N,L,U,C,M,I;const{expect:d,within:p}=__STORYBOOK_MODULE_TEST__,R={from:"2026-05-25T00:00:00.000Z",to:"2026-06-23T00:00:00.000Z",groupBy:"day",totals:{calls:42,inputTokens:12e5,outputTokens:24e4,estCostUsd:12.34},buckets:[],byProvider:[{key:"anthropic",calls:30,inputTokens:9e5,outputTokens:18e4,estCostUsd:9.1},{key:"openai",calls:12,inputTokens:3e5,outputTokens:6e4,estCostUsd:3.24}],byFeature:[{key:"plan",calls:20,inputTokens:7e5,outputTokens:12e4,estCostUsd:7},{key:"act",calls:22,inputTokens:5e5,outputTokens:12e4,estCostUsd:5.34}],byDay:[{key:"2026-06-21",calls:10,inputTokens:3e5,outputTokens:6e4,estCostUsd:3.1},{key:"2026-06-22",calls:14,inputTokens:4e5,outputTokens:8e4,estCostUsd:4.2},{key:"2026-06-23",calls:18,inputTokens:5e5,outputTokens:1e5,estCostUsd:5.04}],warnings:[],costIsEstimate:!0},me={title:"Widgets/UsageWidget",component:W,decorators:[t=>e.jsx("div",{className:"h-[28rem] w-96",children:e.jsx(t,{})})]},c={beforeEach:()=>m([{match:"/usage/summary",json:R}]),play:async({canvasElement:t})=>{const s=p(t);await d(await s.findByText("$12.34")).toBeInTheDocument(),await d(s.getByText(/42 calls/)).toBeInTheDocument(),await d(s.getByText("By provider")).toBeInTheDocument(),await d(s.getByText("By feature")).toBeInTheDocument()}},i={beforeEach:()=>m([{match:"/usage/summary",json:{...R,warnings:[{period:"month",budgetUsd:10,spentUsd:12.34,ratio:1.234,exceeded:!0,message:"Monthly LLM spend $12.34 is over the $10.00 budget."}]}}]),play:async({canvasElement:t})=>{const s=p(t);await d(await s.findByText(/over the \$10\.00 budget/)).toBeInTheDocument()}},l={beforeEach:()=>m([{match:"/usage/summary",json:{...R,totals:{calls:0,inputTokens:0,outputTokens:0,estCostUsd:0},byProvider:[],byFeature:[],byDay:[]}}]),play:async({canvasElement:t})=>{const s=p(t);await d(await s.findByText(/No LLM calls recorded yet/)).toBeInTheDocument()}},u={beforeEach:()=>m([{match:"/usage/summary",status:500}]),play:async({canvasElement:t})=>{const s=p(t);await d(await s.findByText("Couldn’t load usage.")).toBeInTheDocument()}};c.parameters={...c.parameters,docs:{...(v=c.parameters)===null||v===void 0?void 0:v.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/usage/summary',
    json: SUMMARY
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('$12.34')).toBeInTheDocument();
    await expect(canvas.getByText(/42 calls/)).toBeInTheDocument();
    await expect(canvas.getByText('By provider')).toBeInTheDocument();
    await expect(canvas.getByText('By feature')).toBeInTheDocument();
  }
}`,...(h=c.parameters)===null||h===void 0||(x=h.docs)===null||x===void 0?void 0:x.source},description:{story:"Spend, daily bars, and the provider/feature breakdowns from the gateway.",...(f=c.parameters)===null||f===void 0||(g=f.docs)===null||g===void 0?void 0:g.description}}};i.parameters={...i.parameters,docs:{...(_=i.parameters)===null||_===void 0?void 0:_.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/usage/summary',
    json: {
      ...SUMMARY,
      warnings: [{
        period: 'month',
        budgetUsd: 10,
        spentUsd: 12.34,
        ratio: 1.234,
        exceeded: true,
        message: 'Monthly LLM spend $12.34 is over the $10.00 budget.'
      }]
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/over the \\$10\\.00 budget/)).toBeInTheDocument();
  }
}`,...(T=i.parameters)===null||T===void 0||(b=T.docs)===null||b===void 0?void 0:b.source},description:{story:"A breached budget surfaces the warning banner.",...(w=i.parameters)===null||w===void 0||(k=w.docs)===null||k===void 0?void 0:k.description}}};l.parameters={...l.parameters,docs:{...(B=l.parameters)===null||B===void 0?void 0:B.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/usage/summary',
    json: {
      ...SUMMARY,
      totals: {
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
        estCostUsd: 0
      },
      byProvider: [],
      byFeature: [],
      byDay: []
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/No LLM calls recorded yet/)).toBeInTheDocument();
  }
}`,...(E=l.parameters)===null||E===void 0||(j=E.docs)===null||j===void 0?void 0:j.source},description:{story:"No calls recorded → the explanatory empty copy instead of breakdowns.",...(N=l.parameters)===null||N===void 0||(D=N.docs)===null||D===void 0?void 0:D.description}}};u.parameters={...u.parameters,docs:{...(L=u.parameters)===null||L===void 0?void 0:L.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/usage/summary',
    status: 500
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Couldn’t load usage.')).toBeInTheDocument();
  }
}`,...(C=u.parameters)===null||C===void 0||(U=C.docs)===null||U===void 0?void 0:U.source},description:{story:"Gateway `/usage/summary` fails → the error fallback.",...(I=u.parameters)===null||I===void 0||(M=I.docs)===null||M===void 0?void 0:M.description}}};const pe=["Default","OverBudget","NoCalls","Error"];export{c as Default,u as Error,l as NoCalls,i as OverBudget,pe as __namedExportsOrder,me as default};
