import{aO as B,b9 as M,a_ as e,aG as I,K as E,aM as S}from"./iframe-DGTzC655.js";import{i as A}from"./mock-fetch-aFrr3kfG.js";import{I as H}from"./api-C-ORmROe.js";import{u as O,D as R,A as L,a as P,f as K}from"./market-asset-widget-DHBAqb2N.js";import{u as F}from"./use-polling-C_pBHDVc.js";import{W as Y}from"./widget-card-BuOi2C95.js";import{n as D}from"./index-DkH9PpOg.js";import{T as $}from"./trash-2-DYjGCppr.js";import{P as q}from"./plus-CVJEZdtw.js";import"./preload-helper-Dp1pzeXC.js";import"./use-local-storage-CGQMBoGe.js";import"./Select-ef7c0426.esm-B91OB_Ca.js";import"./search-CiSFfyLz.js";import"./spinner-CTUfBIR4.js";import"./pencil-C33RNF2s.js";import"./generateCategoricalChart-C3bbjnAg.js";import"./value-BTdN53H7.js";import"./useQuery-DdeOeSsq.js";/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const G=[["path",{d:"M14 17H5",key:"gfn3mx"}],["path",{d:"M19 7h-9",key:"6i9tg"}],["circle",{cx:"17",cy:"17",r:"3",key:"18b49y"}],["circle",{cx:"7",cy:"7",r:"3",key:"dfmy0x"}]],X=B("settings-2",G);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z=[["path",{d:"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",key:"r04s7s"}]],U=B("star",z),J=6e4,p=s=>`${s.kind}:${s.symbol}`;function W({config:s,onConfigChange:o}){const a=D("dashboard"),[l]=O(),[n,r]=M.useState(!1),{title:m,assets:i}=s;return e.jsx(Y,{title:m||a("watchlist.title"),icon:U,actions:e.jsxs(e.Fragment,{children:[e.jsx(R,{}),e.jsx("button",{type:"button",onClick:()=>r(c=>!c),"aria-label":a(n?"watchlist.doneEditing":"watchlist.edit"),"aria-pressed":n,className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:n?e.jsx(I,{className:"h-3.5 w-3.5"}):e.jsx(X,{className:"h-3.5 w-3.5"})})]}),bodyClassName:"overflow-auto p-3",children:n?e.jsx(V,{config:s,onConfigChange:o}):i.length===0?e.jsx("p",{className:"px-1 py-6 text-center text-sm text-muted-foreground",children:a("watchlist.empty")}):e.jsx("ul",{className:"divide-y divide-border/40",children:i.map(c=>e.jsx(Q,{asset:c,timeframe:l},p(c)))})})}function Q({asset:s,timeframe:o}){var a,l;const{data:n}=F(async()=>H(s.kind,s.symbol,o),J,[s.kind,s.symbol,o]);var r;const m=(r=n==null?void 0:n.points)!==null&&r!==void 0?r:[],i=(a=m.at(-1))===null||a===void 0?void 0:a.c,c=(l=m[0])===null||l===void 0?void 0:l.c,d=c&&i?(i-c)/c*100:null,t=(d??0)>=0;return e.jsxs("li",{className:"flex items-baseline justify-between gap-2 py-1.5",children:[e.jsx("span",{className:"min-w-0 flex-1 truncate text-sm",children:s.name}),i==null?e.jsx("span",{className:"text-xs text-muted-foreground",children:"…"}):e.jsxs("span",{className:"flex items-baseline gap-2 tabular-nums",children:[e.jsx("span",{className:"text-sm",children:P(i)}),e.jsx("span",{className:S("w-16 text-right text-xs font-medium",t?"text-emerald-600 dark:text-emerald-400":"text-destructive"),children:d==null?"—":K(d)})]})]})}function V({config:s,onConfigChange:o}){const a=D("dashboard"),{title:l,assets:n}=s,[r,m]=M.useState("crypto"),i=n.length>=E,c=t=>{i||n.some(y=>p(y)===p(t))||o({...s,assets:[...n,t]})},d=t=>o({...s,assets:n.filter(y=>p(y)!==t)});return e.jsxs("div",{className:"space-y-3",children:[e.jsxs("label",{className:"block space-y-1",children:[e.jsx("span",{className:"text-xs font-medium text-muted-foreground",children:a("watchlist.cardName")}),e.jsx("input",{value:l,onChange:t=>o({...s,title:t.target.value}),placeholder:a("watchlist.cardNamePlaceholder"),className:"w-full rounded-md border border-border/60 bg-transparent px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"})]}),n.length>0&&e.jsx("ul",{className:"space-y-1",children:n.map(t=>e.jsxs("li",{className:"flex items-center gap-2 rounded-md border border-border/50 px-2 py-1",children:[e.jsx("span",{className:"min-w-0 flex-1 truncate text-sm",children:t.name}),e.jsx("span",{className:"shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground",children:t.kind}),e.jsx("button",{type:"button",onClick:()=>d(p(t)),"aria-label":a("watchlist.remove",{name:t.name}),className:"rounded p-0.5 text-muted-foreground hover:text-destructive",children:e.jsx($,{className:"h-3 w-3"})})]},p(t)))}),i?e.jsx("p",{className:"text-[11px] text-muted-foreground",children:a("watchlist.atCap",{max:E})}):e.jsxs("div",{className:"space-y-1.5",children:[e.jsx("div",{className:"flex items-center rounded-md border border-border/60 p-0.5 text-xs",children:["crypto","stock"].map(t=>e.jsx("button",{type:"button",onClick:()=>m(t),"aria-pressed":r===t,className:S("flex-1 rounded px-2 py-1 font-medium transition-colors",r===t?"bg-accent text-accent-foreground":"text-muted-foreground hover:text-foreground"),children:a(t==="crypto"?"market.crypto":"market.stocks")},t))}),e.jsxs("div",{className:"flex items-center gap-1.5",children:[e.jsx(q,{className:"h-3.5 w-3.5 shrink-0 text-muted-foreground","aria-hidden":!0}),e.jsx("div",{className:"min-w-0 flex-1",children:e.jsx(L,{kind:r,placeholder:a(r==="crypto"?"watchlist.addCoin":"watchlist.addStock"),onSelect:t=>c({kind:t.kind,symbol:t.symbol,name:t.name})})})]})]})]})}W.__docgenInfo={description:"",methods:[],displayName:"MarketWatchlistWidget",props:{config:{required:!0,tsType:{name:"MarketWatchlistConfig"},description:""},onConfigChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(config: MarketWatchlistConfig) => void",signature:{arguments:[{type:{name:"MarketWatchlistConfig"},name:"config"}],return:{name:"void"}}},description:""}}};var f,v,g,b,_,w,j,k,N,T;const{expect:x,fn:Z,within:C}=__STORYBOOK_MODULE_TEST__,ee={kind:"crypto",symbol:"bitcoin",timeframe:"7D",points:[{t:1718e9,c:90},{t:17180036e5,c:100}]},ge={title:"Widgets/MarketWatchlistWidget",component:W,args:{onConfigChange:Z()},decorators:[s=>e.jsx("div",{className:"h-80 w-80",children:e.jsx(s,{})})]},u={args:{config:{title:"My coins",assets:[{kind:"crypto",symbol:"bitcoin",name:"Bitcoin"},{kind:"crypto",symbol:"ethereum",name:"Ethereum"}]}},beforeEach:()=>A([{match:"/market/history",json:ee}]),play:async({canvasElement:s})=>{const o=C(s);await x(await o.findByText("Bitcoin")).toBeInTheDocument(),await x(o.getByText("Ethereum")).toBeInTheDocument(),x(await o.findAllByText("+11.11%")).not.toHaveLength(0)}},h={args:{config:{title:"Watchlist",assets:[]}},play:async({canvasElement:s})=>{const o=C(s);await x(await o.findByText(/No assets yet/)).toBeInTheDocument()}};u.parameters={...u.parameters,docs:{...(f=u.parameters)===null||f===void 0?void 0:f.docs,source:{originalSource:`{
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
}`,...(g=u.parameters)===null||g===void 0||(v=g.docs)===null||v===void 0?void 0:v.source},description:{story:"A few tracked assets, each with a sparkline-derived last price + change.",...(_=u.parameters)===null||_===void 0||(b=_.docs)===null||b===void 0?void 0:b.description}}};h.parameters={...h.parameters,docs:{...(w=h.parameters)===null||w===void 0?void 0:w.docs,source:{originalSource:`{
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
}`,...(k=h.parameters)===null||k===void 0||(j=k.docs)===null||j===void 0?void 0:j.source},description:{story:"No assets configured → the empty prompt.",...(T=h.parameters)===null||T===void 0||(N=T.docs)===null||N===void 0?void 0:N.description}}};const be=["Default","Empty"];export{u as Default,h as Empty,be as __namedExportsOrder,ge as default};
