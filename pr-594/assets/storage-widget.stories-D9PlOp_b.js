import{b9 as c,a_ as s,aM as A}from"./iframe-Czd7raPx.js";import{z as W}from"./index-rJ6yUmMW.js";import{W as k}from"./spinner-Dzb2rE6l.js";import{W as F}from"./widget-card-dRhc9O9w.js";import{n as L}from"./index-DvrqZrta.js";import{D as O}from"./database-BIBnr0b_.js";import{R}from"./refresh-cw-YBLUH_1D.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-B07MpugR.js";import"./chevron-down-CfdB0fYF.js";import"./check-CgMNdhk3.js";function q(){const e=L("common"),[a,d]=c.useState(null),[G,j]=c.useState(!1),U={aria:t=>e("ui.gauge.pctUsed",{pct:t}),used:t=>e("ui.gauge.pctUsed",{pct:t}),of:t=>e("ui.gauge.ofTotal",{total:t}),free:t=>e("ui.gauge.free",{free:t})},u=c.useCallback(async()=>{var t;if(typeof navigator>"u"||!(!((t=navigator.storage)===null||t===void 0)&&t.estimate)){d("unsupported");return}j(!0);try{const{usage:I=0,quota:C=0}=await navigator.storage.estimate();d({usage:I,quota:C})}catch{d("error")}finally{j(!1)}},[]);return c.useEffect(()=>{u()},[u]),s.jsx(F,{title:"App cache",icon:O,actions:s.jsx("button",{type:"button",onClick:()=>void u(),"aria-label":"Refresh cache estimate",className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:s.jsx(R,{className:A("h-3 w-3",G&&"animate-spin")})}),bodyClassName:"flex flex-col items-center justify-center gap-3 p-4",children:a===null?s.jsx(k,{}):a==="unsupported"?s.jsx("p",{className:"px-2 text-center text-sm text-muted-foreground",children:"Cache estimates aren’t available in this browser."}):a==="error"?s.jsx("p",{className:"px-2 text-center text-sm text-destructive",children:"Couldn’t read cache usage."}):s.jsx(W,{usedBytes:a.usage,totalBytes:a.quota,labels:U})})}q.__docgenInfo={description:`How much storage *this web app* has cached in the browser (IndexedDB /
CacheStorage), from the Storage Manager estimate — the origin's quota, which
browsers loosely derive from free disk space. This is app-level cache usage,
**not** the device's disk capacity; the Disk widget (gateway \`fs.statfs\`) shows
real hard-drive space. Titled "App cache" to keep the two distinct.`,methods:[],displayName:"StorageWidget"};var p,m,v,f,g,h,y,_,x,w,b,B,T,E,D;const{expect:i,within:S}=__STORYBOOK_MODULE_TEST__;function N(e){Object.defineProperty(navigator,"storage",{configurable:!0,value:e?{estimate:async()=>e}:void 0})}const l=1024**3,$={title:"Widgets/StorageWidget",component:q,decorators:[e=>s.jsx("div",{className:"h-80 w-72",children:s.jsx(e,{})})]},o={beforeEach:()=>N({usage:42*l,quota:128*l}),play:async({canvasElement:e})=>{const a=S(e);await i(await a.findByText("App cache")).toBeInTheDocument(),await i(await a.findByText(/33% used/)).toBeInTheDocument(),i(e.querySelectorAll("circle")).toHaveLength(2)}},r={beforeEach:()=>N({usage:120*l,quota:128*l}),play:async({canvasElement:e})=>{const a=S(e);await i(await a.findByText(/94% used/)).toBeInTheDocument()}},n={beforeEach:()=>N(void 0),play:async({canvasElement:e})=>{const a=S(e);await i(await a.findByText(/aren’t available/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(p=o.parameters)===null||p===void 0?void 0:p.docs,source:{originalSource:`{
  beforeEach: () => stubEstimate({
    usage: 42 * GB,
    quota: 128 * GB
  }),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('App cache')).toBeInTheDocument();
    await expect(await canvas.findByText(/33% used/)).toBeInTheDocument();
    // The gauge renders as an inline SVG with a track + progress ring.
    expect(canvasElement.querySelectorAll('circle')).toHaveLength(2);
  }
}`,...(v=o.parameters)===null||v===void 0||(m=v.docs)===null||m===void 0?void 0:m.source},description:{story:"A partly-full quota: ~42 GB of 128 GB used → 33%.",...(g=o.parameters)===null||g===void 0||(f=g.docs)===null||f===void 0?void 0:f.description}}};r.parameters={...r.parameters,docs:{...(h=r.parameters)===null||h===void 0?void 0:h.docs,source:{originalSource:`{
  beforeEach: () => stubEstimate({
    usage: 120 * GB,
    quota: 128 * GB
  }),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/94% used/)).toBeInTheDocument();
  }
}`,...(_=r.parameters)===null||_===void 0||(y=_.docs)===null||y===void 0?void 0:y.source},description:{story:"Nearly full: 120 GB of 128 GB → 94%.",...(w=r.parameters)===null||w===void 0||(x=w.docs)===null||x===void 0?void 0:x.description}}};n.parameters={...n.parameters,docs:{...(b=n.parameters)===null||b===void 0?void 0:b.docs,source:{originalSource:`{
  beforeEach: () => stubEstimate(undefined),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/aren’t available/)).toBeInTheDocument();
  }
}`,...(T=n.parameters)===null||T===void 0||(B=T.docs)===null||B===void 0?void 0:B.source},description:{story:"No Storage Manager API → the unsupported message.",...(D=n.parameters)===null||D===void 0||(E=D.docs)===null||E===void 0?void 0:E.description}}};const ee=["Default","NearlyFull","Unsupported"];export{o as Default,r as NearlyFull,n as Unsupported,ee as __namedExportsOrder,$ as default};
