import{b7 as W,b4 as e,aC as K,aR as P,H as q}from"./iframe-BgzrFP2X.js";import{i as x}from"./mock-fetch-aFrr3kfG.js";import{a6 as z}from"./api-DB4WVoNn.js";import{u as J,W as Q}from"./dashboard-widget-labels-B2tY1ceP.js";import{e as X}from"./i18n-labels-Bt0XlFRc.js";import{a as H}from"./use-locale-format-DKCH0Eeq.js";import{u as ee}from"./use-polling-BQpJYMXM.js";import{W as te}from"./widget-card-BGTBOIi5.js";import{R as se}from"./refresh-cw-C6QogJ0X.js";import"./preload-helper-Dp1pzeXC.js";import"./star-BMaOOn5x.js";import"./chart-line-4eyueXHO.js";import"./layout-grid-DGeGSYRJ.js";import"./globe-DO3SgpXC.js";import"./database-DarwPU4u.js";import"./memory-stick-DDJAPReK.js";import"./rocket-D5ooRLZr.js";import"./newspaper-CsxxJNKz.js";import"./users-nVZNJiYP.js";import"./folder-git-2-CqSRF3Xn.js";import"./bot-3BU_codW.js";import"./brain-1L8t2Clf.js";import"./workflow-BttUnRUb.js";import"./square-terminal-CwoQA1lS.js";import"./clock-BaIWqBKq.js";import"./sticky-note-U_zdojnF.js";import"./folder-kanban-C46T-WBo.js";import"./useQuery-C1dtSrZF.js";const ae=6e4,V=30;function oe(){const t=new Date;return t.setDate(t.getDate()-(V-1)),t.setHours(0,0,0,0),t.toISOString()}function Z(){var t,a;const n=W("dashboard"),h=W("common"),g=J(),p=H(),{data:s,error:y,loading:o,refresh:i}=ee(()=>z({from:oe(),groupBy:"day"}),ae),$=s?s.byDay.reduce((r,G)=>Math.max(r,G.estCostUsd),0):0;return e.jsx(te,{title:g.label("usage"),icon:Q,actions:e.jsx("button",{type:"button",onClick:i,"aria-label":n("usage.refresh"),className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:e.jsx(se,{className:P("h-3 w-3",o&&"animate-spin")})}),bodyClassName:"flex flex-col gap-3 overflow-y-auto p-4",children:y&&!s?e.jsx("p",{className:"m-auto text-sm text-destructive",children:n("usage.error")}):!s&&o?e.jsx("p",{className:"m-auto text-sm text-muted-foreground",children:h("loading")}):s?e.jsxs(e.Fragment,{children:[s.warnings.map(r=>e.jsxs("div",{className:P("flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-xs",r.exceeded?"border-destructive/40 bg-destructive/10 text-destructive":"border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"),children:[e.jsx(K,{className:"mt-0.5 h-3.5 w-3.5 shrink-0","aria-hidden":!0}),e.jsx("span",{children:r.message})]},r.period)),e.jsxs("div",{children:[e.jsx("span",{className:"text-3xl font-semibold tabular-nums leading-none",children:p(s.totals.estCostUsd)}),e.jsx("span",{className:"ml-1.5 text-xs text-muted-foreground",children:n("usage.estOverWindow",{days:V,count:s.totals.calls})})]}),s.byDay.length>0&&e.jsxs("div",{children:[e.jsx("div",{className:"flex h-12 items-end gap-0.5","aria-hidden":!0,children:s.byDay.map(r=>e.jsx("div",{className:"flex-1 rounded-sm bg-primary/60",style:{height:`${$>0?Math.max(4,r.estCostUsd/$*100):4}%`},title:n("usage.barTooltip",{day:r.key,cost:p(r.estCostUsd)})},r.key))}),e.jsxs("div",{className:"mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground",children:[e.jsx("span",{children:(t=s.byDay[0])===null||t===void 0?void 0:t.key.slice(5)}),e.jsx("span",{children:(a=s.byDay.at(-1))===null||a===void 0?void 0:a.key.slice(5)})]})]}),s.totals.calls===0?e.jsx("p",{className:"text-xs text-muted-foreground",children:n("usage.empty")}):e.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[e.jsx(Y,{title:n("usage.byProvider"),buckets:s.byProvider,axis:"provider"}),e.jsx(Y,{title:n("usage.byFeature"),buckets:s.byFeature,axis:"feature"})]}),e.jsx("p",{className:"mt-auto text-[10px] text-muted-foreground",children:n("usage.estimateNote")})]}):null})}function Y({title:t,buckets:a,axis:n}){const h=W("common"),g=H(),p=X(),s=o=>{var i;return n==="provider"?(i=q[o])!==null&&i!==void 0?i:o:p(o)},y=[...a].sort((o,i)=>i.estCostUsd-o.estCostUsd).slice(0,5);return e.jsxs("div",{className:"min-w-0",children:[e.jsx("p",{className:"mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground",children:t}),e.jsx("ul",{className:"flex flex-col gap-1",children:y.length===0?e.jsx("li",{className:"text-xs text-muted-foreground",children:h("units.emDash")}):y.map(o=>e.jsxs("li",{className:"flex items-center justify-between gap-2 text-xs",children:[e.jsx("span",{className:"truncate",children:s(o.key)}),e.jsx("span",{className:"shrink-0 tabular-nums text-muted-foreground",children:g(o.estCostUsd)})]},o.key))})]})}Z.__docgenInfo={description:"",methods:[],displayName:"UsageWidget"};var f,b,_,T,k,w,B,j,D,N,U,E,C,M,L,I,S,O,F,R;const{expect:d,within:v}=__STORYBOOK_MODULE_TEST__,A={from:"2026-05-25T00:00:00.000Z",to:"2026-06-23T00:00:00.000Z",groupBy:"day",totals:{calls:42,inputTokens:12e5,outputTokens:24e4,estCostUsd:12.34},buckets:[],byProvider:[{key:"anthropic",calls:30,inputTokens:9e5,outputTokens:18e4,estCostUsd:9.1},{key:"openai",calls:12,inputTokens:3e5,outputTokens:6e4,estCostUsd:3.24}],byFeature:[{key:"plan",calls:20,inputTokens:7e5,outputTokens:12e4,estCostUsd:7},{key:"act",calls:22,inputTokens:5e5,outputTokens:12e4,estCostUsd:5.34}],byDay:[{key:"2026-06-21",calls:10,inputTokens:3e5,outputTokens:6e4,estCostUsd:3.1},{key:"2026-06-22",calls:14,inputTokens:4e5,outputTokens:8e4,estCostUsd:4.2},{key:"2026-06-23",calls:18,inputTokens:5e5,outputTokens:1e5,estCostUsd:5.04}],warnings:[],costIsEstimate:!0,composition:{llmUsd:12.34,sessionMeasuredUsd:0,sessionEstimatedUsd:0,unpricedSessions:0}},Le={title:"Widgets/UsageWidget",component:Z,decorators:[t=>e.jsx("div",{className:"h-[28rem] w-96",children:e.jsx(t,{})})]},c={beforeEach:()=>x([{match:"/usage/summary",json:A}]),play:async({canvasElement:t})=>{const a=v(t);await d(await a.findByText("$12.34")).toBeInTheDocument(),await d(a.getByText(/42 calls/)).toBeInTheDocument(),await d(a.getByText("By provider")).toBeInTheDocument(),await d(a.getByText("By feature")).toBeInTheDocument()}},l={beforeEach:()=>x([{match:"/usage/summary",json:{...A,warnings:[{period:"month",budgetUsd:10,spentUsd:12.34,ratio:1.234,exceeded:!0,message:"Monthly LLM spend $12.34 is over the $10.00 budget."}]}}]),play:async({canvasElement:t})=>{const a=v(t);await d(await a.findByText(/over the \$10\.00 budget/)).toBeInTheDocument()}},m={beforeEach:()=>x([{match:"/usage/summary",json:{...A,totals:{calls:0,inputTokens:0,outputTokens:0,estCostUsd:0},byProvider:[],byFeature:[],byDay:[]}}]),play:async({canvasElement:t})=>{const a=v(t);await d(await a.findByText(/No LLM calls recorded yet/)).toBeInTheDocument()}},u={beforeEach:()=>x([{match:"/usage/summary",status:500}]),play:async({canvasElement:t})=>{const a=v(t);await d(await a.findByText("Couldn’t load usage.")).toBeInTheDocument()}};c.parameters={...c.parameters,docs:{...(f=c.parameters)===null||f===void 0?void 0:f.docs,source:{originalSource:`{
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
}`,...(_=c.parameters)===null||_===void 0||(b=_.docs)===null||b===void 0?void 0:b.source},description:{story:"Spend, daily bars, and the provider/feature breakdowns from the gateway.",...(k=c.parameters)===null||k===void 0||(T=k.docs)===null||T===void 0?void 0:T.description}}};l.parameters={...l.parameters,docs:{...(w=l.parameters)===null||w===void 0?void 0:w.docs,source:{originalSource:`{
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
}`,...(j=l.parameters)===null||j===void 0||(B=j.docs)===null||B===void 0?void 0:B.source},description:{story:"A breached budget surfaces the warning banner.",...(N=l.parameters)===null||N===void 0||(D=N.docs)===null||D===void 0?void 0:D.description}}};m.parameters={...m.parameters,docs:{...(U=m.parameters)===null||U===void 0?void 0:U.docs,source:{originalSource:`{
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
}`,...(C=m.parameters)===null||C===void 0||(E=C.docs)===null||E===void 0?void 0:E.source},description:{story:"No calls recorded → the explanatory empty copy instead of breakdowns.",...(L=m.parameters)===null||L===void 0||(M=L.docs)===null||M===void 0?void 0:M.description}}};u.parameters={...u.parameters,docs:{...(I=u.parameters)===null||I===void 0?void 0:I.docs,source:{originalSource:`{
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
}`,...(O=u.parameters)===null||O===void 0||(S=O.docs)===null||S===void 0?void 0:S.source},description:{story:"Gateway `/usage/summary` fails → the error fallback.",...(R=u.parameters)===null||R===void 0||(F=R.docs)===null||F===void 0?void 0:F.description}}};const Ie=["Default","OverBudget","NoCalls","Error"];export{c as Default,u as Error,m as NoCalls,l as OverBudget,Ie as __namedExportsOrder,Le as default};
