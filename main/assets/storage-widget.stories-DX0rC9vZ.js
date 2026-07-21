import{b5 as i,aX as t,aI as A}from"./iframe-YcwUPbpf.js";import{p as C}from"./index-BIP5OI9G.js";import{W as U}from"./spinner-CchmRRKG.js";import{W}from"./widget-card-D3N2lozk.js";import{D as k}from"./database-Dh1Yj5fG.js";import{R as F}from"./refresh-cw-CE3PgelX.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-DE11INnS.js";import"./chevron-down-B0zPTaUR.js";import"./check-D4Y8r1Yl.js";function I(){const[e,a]=i.useState(null),[q,N]=i.useState(!1),l=i.useCallback(async()=>{var d;if(typeof navigator>"u"||!(!((d=navigator.storage)===null||d===void 0)&&d.estimate)){a("unsupported");return}N(!0);try{const{usage:j=0,quota:G=0}=await navigator.storage.estimate();a({usage:j,quota:G})}catch{a("error")}finally{N(!1)}},[]);return i.useEffect(()=>{l()},[l]),t.jsx(W,{title:"App cache",icon:k,actions:t.jsx("button",{type:"button",onClick:()=>void l(),"aria-label":"Refresh cache estimate",className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:t.jsx(F,{className:A("h-3 w-3",q&&"animate-spin")})}),bodyClassName:"flex flex-col items-center justify-center gap-3 p-4",children:e===null?t.jsx(U,{}):e==="unsupported"?t.jsx("p",{className:"px-2 text-center text-sm text-muted-foreground",children:"Cache estimates aren’t available in this browser."}):e==="error"?t.jsx("p",{className:"px-2 text-center text-sm text-destructive",children:"Couldn’t read cache usage."}):t.jsx(C,{usedBytes:e.usage,totalBytes:e.quota})})}I.__docgenInfo={description:`How much storage *this web app* has cached in the browser (IndexedDB /
CacheStorage), from the Storage Manager estimate — the origin's quota, which
browsers loosely derive from free disk space. This is app-level cache usage,
**not** the device's disk capacity; the Disk widget (gateway \`fs.statfs\`) shows
real hard-drive space. Titled "App cache" to keep the two distinct.`,methods:[],displayName:"StorageWidget"};var u,p,m,v,h,f,g,y,_,x,w,B,b,E,T;const{expect:n,within:D}=__STORYBOOK_MODULE_TEST__;function S(e){Object.defineProperty(navigator,"storage",{configurable:!0,value:e?{estimate:async()=>e}:void 0})}const c=1024**3,z={title:"Widgets/StorageWidget",component:I,decorators:[e=>t.jsx("div",{className:"h-80 w-72",children:t.jsx(e,{})})]},s={beforeEach:()=>S({usage:42*c,quota:128*c}),play:async({canvasElement:e})=>{const a=D(e);await n(await a.findByText("App cache")).toBeInTheDocument(),await n(await a.findByText(/33% used/)).toBeInTheDocument(),n(e.querySelectorAll("circle")).toHaveLength(2)}},o={beforeEach:()=>S({usage:120*c,quota:128*c}),play:async({canvasElement:e})=>{const a=D(e);await n(await a.findByText(/94% used/)).toBeInTheDocument()}},r={beforeEach:()=>S(void 0),play:async({canvasElement:e})=>{const a=D(e);await n(await a.findByText(/aren’t available/)).toBeInTheDocument()}};s.parameters={...s.parameters,docs:{...(u=s.parameters)===null||u===void 0?void 0:u.docs,source:{originalSource:`{
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
}`,...(m=s.parameters)===null||m===void 0||(p=m.docs)===null||p===void 0?void 0:p.source},description:{story:"A partly-full quota: ~42 GB of 128 GB used → 33%.",...(h=s.parameters)===null||h===void 0||(v=h.docs)===null||v===void 0?void 0:v.description}}};o.parameters={...o.parameters,docs:{...(f=o.parameters)===null||f===void 0?void 0:f.docs,source:{originalSource:`{
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
}`,...(y=o.parameters)===null||y===void 0||(g=y.docs)===null||g===void 0?void 0:g.source},description:{story:"Nearly full: 120 GB of 128 GB → 94%.",...(x=o.parameters)===null||x===void 0||(_=x.docs)===null||_===void 0?void 0:_.description}}};r.parameters={...r.parameters,docs:{...(w=r.parameters)===null||w===void 0?void 0:w.docs,source:{originalSource:`{
  beforeEach: () => stubEstimate(undefined),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/aren’t available/)).toBeInTheDocument();
  }
}`,...(b=r.parameters)===null||b===void 0||(B=b.docs)===null||B===void 0?void 0:B.source},description:{story:"No Storage Manager API → the unsupported message.",...(T=r.parameters)===null||T===void 0||(E=T.docs)===null||E===void 0?void 0:E.description}}};const J=["Default","NearlyFull","Unsupported"];export{s as Default,o as NearlyFull,r as Unsupported,J as __namedExportsOrder,z as default};
