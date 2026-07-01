import{h as E,r as B,n as e,X as W,f as M}from"./iframe-DaFpXuLo.js";import{i as A}from"./mock-fetch-aFrr3kfG.js";import{j as T}from"./webhook-Ddo3p-Ag.js";import{r as C}from"./api-CAvxGH1b.js";import{u as I,D as R,A as H,a as O,f as L}from"./market-asset-widget-DhpJkzLO.js";import{u as P}from"./use-polling-CNXbODYU.js";import{W as F}from"./widget-card-BPwsfB4B.js";import{T as K}from"./trash-2-BzJV2l1C.js";import{P as Y}from"./plus-p57Y1lYd.js";import"./preload-helper-Dp1pzeXC.js";import"./use-local-storage-ujj7069g.js";import"./Select-ef7c0426.esm-4revDPTH.js";import"./search-DpeGj0bq.js";import"./spinner-D7gtaFsX.js";import"./pencil-C67ZWaIl.js";import"./useQuery-zpDdwBSq.js";/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $=[["path",{d:"M14 17H5",key:"gfn3mx"}],["path",{d:"M19 7h-9",key:"6i9tg"}],["circle",{cx:"17",cy:"17",r:"3",key:"18b49y"}],["circle",{cx:"7",cy:"7",r:"3",key:"dfmy0x"}]],q=E("settings-2",$);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const X=[["path",{d:"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",key:"r04s7s"}]],z=E("star",X),G=6e4,d=s=>`${s.kind}:${s.symbol}`;function D({config:s,onConfigChange:n}){const[c]=I(),[a,r]=B.useState(!1),{title:l,assets:i}=s;return e.jsx(F,{title:l||"Watchlist",icon:z,actions:e.jsxs(e.Fragment,{children:[e.jsx(R,{}),e.jsx("button",{type:"button",onClick:()=>r(o=>!o),"aria-label":a?"Done editing":"Edit watchlist","aria-pressed":a,className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:a?e.jsx(W,{className:"h-3.5 w-3.5"}):e.jsx(q,{className:"h-3.5 w-3.5"})})]}),bodyClassName:"overflow-auto p-3",children:a?e.jsx(J,{config:s,onConfigChange:n}):i.length===0?e.jsx("p",{className:"px-1 py-6 text-center text-sm text-muted-foreground",children:"No assets yet — open settings to add some."}):e.jsx("ul",{className:"divide-y divide-border/40",children:i.map(o=>e.jsx(U,{asset:o,timeframe:c},d(o)))})})}function U({asset:s,timeframe:n}){var c,a;const{data:r}=P(async()=>C(s.kind,s.symbol,n),G,[s.kind,s.symbol,n]);var l;const i=(l=r==null?void 0:r.points)!==null&&l!==void 0?l:[],o=(c=i.at(-1))===null||c===void 0?void 0:c.c,m=(a=i[0])===null||a===void 0?void 0:a.c,t=m&&o?(o-m)/m*100:null,p=(t??0)>=0;return e.jsxs("li",{className:"flex items-baseline justify-between gap-2 py-1.5",children:[e.jsx("span",{className:"min-w-0 flex-1 truncate text-sm",children:s.name}),o==null?e.jsx("span",{className:"text-xs text-muted-foreground",children:"…"}):e.jsxs("span",{className:"flex items-baseline gap-2 tabular-nums",children:[e.jsx("span",{className:"text-sm",children:O(o)}),e.jsx("span",{className:M("w-16 text-right text-xs font-medium",p?"text-emerald-600 dark:text-emerald-400":"text-destructive"),children:t==null?"—":L(t)})]})]})}function J({config:s,onConfigChange:n}){const{title:c,assets:a}=s,[r,l]=B.useState("crypto"),i=a.length>=T,o=t=>{i||a.some(p=>d(p)===d(t))||n({...s,assets:[...a,t]})},m=t=>n({...s,assets:a.filter(p=>d(p)!==t)});return e.jsxs("div",{className:"space-y-3",children:[e.jsxs("label",{className:"block space-y-1",children:[e.jsx("span",{className:"text-xs font-medium text-muted-foreground",children:"Card name"}),e.jsx("input",{value:c,onChange:t=>n({...s,title:t.target.value}),placeholder:"e.g. My coins",className:"w-full rounded-md border border-border/60 bg-transparent px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"})]}),a.length>0&&e.jsx("ul",{className:"space-y-1",children:a.map(t=>e.jsxs("li",{className:"flex items-center gap-2 rounded-md border border-border/50 px-2 py-1",children:[e.jsx("span",{className:"min-w-0 flex-1 truncate text-sm",children:t.name}),e.jsx("span",{className:"shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground",children:t.kind}),e.jsx("button",{type:"button",onClick:()=>m(d(t)),"aria-label":`Remove ${t.name}`,className:"rounded p-0.5 text-muted-foreground hover:text-destructive",children:e.jsx(K,{className:"h-3 w-3"})})]},d(t)))}),i?e.jsxs("p",{className:"text-[11px] text-muted-foreground",children:["At the ",T,"-asset limit — remove one to add another."]}):e.jsxs("div",{className:"space-y-1.5",children:[e.jsx("div",{className:"flex items-center rounded-md border border-border/60 p-0.5 text-xs",children:["crypto","stock"].map(t=>e.jsx("button",{type:"button",onClick:()=>l(t),"aria-pressed":r===t,className:M("flex-1 rounded px-2 py-1 font-medium transition-colors",r===t?"bg-accent text-accent-foreground":"text-muted-foreground hover:text-foreground"),children:t==="crypto"?"Crypto":"Stocks"},t))}),e.jsxs("div",{className:"flex items-center gap-1.5",children:[e.jsx(Y,{className:"h-3.5 w-3.5 shrink-0 text-muted-foreground","aria-hidden":!0}),e.jsx("div",{className:"min-w-0 flex-1",children:e.jsx(H,{kind:r,placeholder:r==="crypto"?"Add a coin…":"Add a stock…",onSelect:t=>o({kind:t.kind,symbol:t.symbol,name:t.name})})})]})]})]})}D.__docgenInfo={description:"",methods:[],displayName:"MarketWatchlistWidget",props:{config:{required:!0,tsType:{name:"MarketWatchlistConfig"},description:""},onConfigChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(config: MarketWatchlistConfig) => void",signature:{arguments:[{type:{name:"MarketWatchlistConfig"},name:"config"}],return:{name:"void"}}},description:""}}};var y,f,v,g,b,_,j,k,N,w;const{expect:h,fn:Q,within:S}=__STORYBOOK_MODULE_TEST__,V={kind:"crypto",symbol:"bitcoin",timeframe:"7D",points:[{t:1718e9,c:90},{t:17180036e5,c:100}]},he={title:"Widgets/MarketWatchlistWidget",component:D,args:{onConfigChange:Q()},decorators:[s=>e.jsx("div",{className:"h-80 w-80",children:e.jsx(s,{})})]},u={args:{config:{title:"My coins",assets:[{kind:"crypto",symbol:"bitcoin",name:"Bitcoin"},{kind:"crypto",symbol:"ethereum",name:"Ethereum"}]}},beforeEach:()=>A([{match:"/market/history",json:V}]),play:async({canvasElement:s})=>{const n=S(s);await h(await n.findByText("Bitcoin")).toBeInTheDocument(),await h(n.getByText("Ethereum")).toBeInTheDocument(),h(await n.findAllByText("+11.11%")).not.toHaveLength(0)}},x={args:{config:{title:"Watchlist",assets:[]}},play:async({canvasElement:s})=>{const n=S(s);await h(await n.findByText(/No assets yet/)).toBeInTheDocument()}};u.parameters={...u.parameters,docs:{...(y=u.parameters)===null||y===void 0?void 0:y.docs,source:{originalSource:`{
  args: {
    config: {
      title: 'My coins',
      assets: [{
        kind: 'crypto',
        symbol: 'bitcoin',
        name: 'Bitcoin'
      }, {
        kind: 'crypto',
        symbol: 'ethereum',
        name: 'Ethereum'
      }]
    }
  },
  beforeEach: () => installMockFetch([{
    match: '/market/history',
    json: HISTORY
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Bitcoin')).toBeInTheDocument();
    await expect(canvas.getByText('Ethereum')).toBeInTheDocument();
    // last close 100 → +11.11% vs the first point (90); the per-row history loads
    // asynchronously, so wait for it.
    expect(await canvas.findAllByText('+11.11%')).not.toHaveLength(0);
  }
}`,...(v=u.parameters)===null||v===void 0||(f=v.docs)===null||f===void 0?void 0:f.source},description:{story:"A few tracked assets, each with a sparkline-derived last price + change.",...(b=u.parameters)===null||b===void 0||(g=b.docs)===null||g===void 0?void 0:g.description}}};x.parameters={...x.parameters,docs:{...(_=x.parameters)===null||_===void 0?void 0:_.docs,source:{originalSource:`{
  args: {
    config: {
      title: 'Watchlist',
      assets: []
    }
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/No assets yet/)).toBeInTheDocument();
  }
}`,...(k=x.parameters)===null||k===void 0||(j=k.docs)===null||j===void 0?void 0:j.source},description:{story:"No assets configured → the empty prompt.",...(w=x.parameters)===null||w===void 0||(N=w.docs)===null||N===void 0?void 0:N.description}}};const ye=["Default","Empty"];export{u as Default,x as Empty,ye as __namedExportsOrder,he as default};
