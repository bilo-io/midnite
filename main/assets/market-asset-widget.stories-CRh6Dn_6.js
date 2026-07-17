import{n as v}from"./iframe-DLK6r6p_.js";import{i as _}from"./mock-fetch-aFrr3kfG.js";import{M as g}from"./market-asset-widget-BJu94cjx.js";import"./preload-helper-Dp1pzeXC.js";import"./api-ztCVvV6I.js";import"./inbound-HnPqdwPM.js";import"./use-local-storage-CLGFayeF.js";import"./use-polling-B3GkKoZF.js";import"./useQuery-DpdCDyeu.js";import"./Select-ef7c0426.esm-eNKT3OL1.js";import"./index-DifjHr3G.js";import"./search-BET51jRj.js";import"./spinner-wIUMpr-Y.js";import"./widget-card-DsjAdUyB.js";import"./pencil-Du_3HytX.js";import"./generateCategoricalChart-CvolWE7W.js";import"./value-BTdN53H7.js";var r,n,s,i,c,m,d,l,p,u;const{expect:h,fn:E,within:f}=__STORYBOOK_MODULE_TEST__,y={kind:"crypto",symbol:"bitcoin",name:"Bitcoin"},T={kind:"crypto",symbol:"bitcoin",name:"Bitcoin",price:65e3,open:63e3,high:66e3,low:62500,close:64800,change:2e3,changePct:2.5,currency:"USD",at:"2026-06-23T12:00:00.000Z"},k={kind:"crypto",symbol:"bitcoin",timeframe:"7D",points:Array.from({length:12},(e,t)=>({t:1718e9+t*36e5,c:6e4+t*500}))},G={title:"Widgets/MarketAssetWidget",component:g,args:{onConfigChange:E()},decorators:[e=>v.jsx("div",{className:"h-80 w-80",children:v.jsx(e,{})})]},a={args:{config:y},beforeEach:()=>_([{match:"/market/quote",json:T},{match:"/market/history",json:k}]),play:async({canvasElement:e})=>{const t=f(e);await h(await t.findByText("$65,000.00")).toBeInTheDocument(),await h(t.getByText("+2.50%")).toBeInTheDocument()}},o={args:{config:y},beforeEach:()=>_([{match:"/market/quote",status:500},{match:"/market/history",status:500}]),play:async({canvasElement:e})=>{const t=f(e);await h(await t.findByText("Couldn’t load market data.")).toBeInTheDocument()}};a.parameters={...a.parameters,docs:{...(r=a.parameters)===null||r===void 0?void 0:r.docs,source:{originalSource:`{
  args: {
    config: CONFIG
  },
  beforeEach: () => installMockFetch([{
    match: '/market/quote',
    json: QUOTE
  }, {
    match: '/market/history',
    json: HISTORY
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('$65,000.00')).toBeInTheDocument();
    await expect(canvas.getByText('+2.50%')).toBeInTheDocument();
  }
}`,...(s=a.parameters)===null||s===void 0||(n=s.docs)===null||n===void 0?void 0:n.source},description:{story:"A configured asset: quote headline, % change, and OHLC from the gateway.",...(c=a.parameters)===null||c===void 0||(i=c.docs)===null||i===void 0?void 0:i.description}}};o.parameters={...o.parameters,docs:{...(m=o.parameters)===null||m===void 0?void 0:m.docs,source:{originalSource:`{
  args: {
    config: CONFIG
  },
  beforeEach: () => installMockFetch([{
    match: '/market/quote',
    status: 500
  }, {
    match: '/market/history',
    status: 500
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Couldn’t load market data.')).toBeInTheDocument();
  }
}`,...(l=o.parameters)===null||l===void 0||(d=l.docs)===null||d===void 0?void 0:d.source},description:{story:"Quote + history both fail → the error fallback.",...(u=o.parameters)===null||u===void 0||(p=u.docs)===null||p===void 0?void 0:p.description}}};const H=["Default","Error"];export{a as Default,o as Error,H as __namedExportsOrder,G as default};
