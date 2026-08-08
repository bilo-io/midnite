import{b3 as q,bc as d,b0 as o,aN as C}from"./iframe-pWg6ZGrB.js";import{Z as O}from"./index-UGZ6tnU3.js";import{u as R}from"./dashboard-widget-labels-C-U_9HTG.js";import{u as H}from"./use-unit-format-lfzmqLYt.js";import{W as M}from"./spinner-BUHLEDib.js";import{W as P}from"./widget-card-C4hY7wae.js";import{D as Z}from"./database-DPhCXaLX.js";import{R as K}from"./refresh-cw-deCM7X2J.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-BqIheCCW.js";import"./chevron-down-Bg_Y5Vy9.js";import"./check-BiOl4hOc.js";import"./star-DIfKQgUb.js";import"./chart-line-4YE6MS2O.js";import"./layout-grid-Csbkz03y.js";import"./globe-CR1kMyUQ.js";import"./memory-stick-C5biFJIM.js";import"./rocket-Bd0TdNPm.js";import"./newspaper-CQ5XqLdQ.js";import"./users-PdpMU4VS.js";import"./folder-git-2-Ig6byRlE.js";import"./bot-C1iNwFgf.js";import"./brain-D6eDBZ8k.js";import"./workflow-CnyhAbwI.js";import"./square-terminal-Bz3I2JgO.js";import"./clock-BiK4yzy_.js";import"./sticky-note-CdyEPq1E.js";import"./folder-kanban-CaokFsEI.js";import"./use-locale-format-BpcuPO3i.js";function G(){const e=q("dashboard"),t=q("common"),W=R(),{bytes:F}=H(),[r,p]=d.useState(null),[L,I]=d.useState(!1),k={aria:a=>t("ui.gauge.pctUsed",{pct:a}),used:a=>t("ui.gauge.pctUsed",{pct:a}),of:a=>t("ui.gauge.ofTotal",{total:a}),free:a=>t("ui.gauge.free",{free:a}),bytes:F},u=d.useCallback(async()=>{var a;if(typeof navigator>"u"||!(!((a=navigator.storage)===null||a===void 0)&&a.estimate)){p("unsupported");return}I(!0);try{const{usage:U=0,quota:A=0}=await navigator.storage.estimate();p({usage:U,quota:A})}catch{p("error")}finally{I(!1)}},[]);return d.useEffect(()=>{u()},[u]),o.jsx(P,{title:W.label("storage"),icon:Z,actions:o.jsx("button",{type:"button",onClick:()=>void u(),"aria-label":e("storage.refresh"),className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:o.jsx(K,{className:C("h-3 w-3",L&&"animate-spin")})}),bodyClassName:"flex flex-col items-center justify-center gap-3 p-4",children:r===null?o.jsx(M,{}):r==="unsupported"?o.jsx("p",{className:"px-2 text-center text-sm text-muted-foreground",children:e("storage.unsupported")}):r==="error"?o.jsx("p",{className:"px-2 text-center text-sm text-destructive",children:e("storage.error")}):o.jsx(O,{usedBytes:r.usage,totalBytes:r.quota,labels:k})})}G.__docgenInfo={description:`How much storage *this web app* has cached in the browser (IndexedDB /
CacheStorage), from the Storage Manager estimate — the origin's quota, which
browsers loosely derive from free disk space. This is app-level cache usage,
**not** the device's disk capacity; the Disk widget (gateway \`fs.statfs\`) shows
real hard-drive space. Titled "App cache" to keep the two distinct.`,methods:[],displayName:"StorageWidget"};var m,v,g,f,h,y,_,x,w,b,B,T,E,D,N;const{expect:c,within:S}=__STORYBOOK_MODULE_TEST__;function j(e){Object.defineProperty(navigator,"storage",{configurable:!0,value:e?{estimate:async()=>e}:void 0})}const l=1024**3,be={title:"Widgets/StorageWidget",component:G,decorators:[e=>o.jsx("div",{className:"h-80 w-72",children:o.jsx(e,{})})]},s={beforeEach:()=>j({usage:42*l,quota:128*l}),play:async({canvasElement:e})=>{const t=S(e);await c(await t.findByText("App cache")).toBeInTheDocument(),await c(await t.findByText(/33% used/)).toBeInTheDocument(),c(e.querySelectorAll("circle")).toHaveLength(2)}},n={beforeEach:()=>j({usage:120*l,quota:128*l}),play:async({canvasElement:e})=>{const t=S(e);await c(await t.findByText(/94% used/)).toBeInTheDocument()}},i={beforeEach:()=>j(void 0),play:async({canvasElement:e})=>{const t=S(e);await c(await t.findByText(/aren’t available/)).toBeInTheDocument()}};s.parameters={...s.parameters,docs:{...(m=s.parameters)===null||m===void 0?void 0:m.docs,source:{originalSource:`{
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
}`,...(g=s.parameters)===null||g===void 0||(v=g.docs)===null||v===void 0?void 0:v.source},description:{story:"A partly-full quota: ~42 GB of 128 GB used → 33%.",...(h=s.parameters)===null||h===void 0||(f=h.docs)===null||f===void 0?void 0:f.description}}};n.parameters={...n.parameters,docs:{...(y=n.parameters)===null||y===void 0?void 0:y.docs,source:{originalSource:`{
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
}`,...(x=n.parameters)===null||x===void 0||(_=x.docs)===null||_===void 0?void 0:_.source},description:{story:"Nearly full: 120 GB of 128 GB → 94%.",...(b=n.parameters)===null||b===void 0||(w=b.docs)===null||w===void 0?void 0:w.description}}};i.parameters={...i.parameters,docs:{...(B=i.parameters)===null||B===void 0?void 0:B.docs,source:{originalSource:`{
  beforeEach: () => stubEstimate(undefined),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/aren’t available/)).toBeInTheDocument();
  }
}`,...(E=i.parameters)===null||E===void 0||(T=E.docs)===null||T===void 0?void 0:T.source},description:{story:"No Storage Manager API → the unsupported message.",...(N=i.parameters)===null||N===void 0||(D=N.docs)===null||D===void 0?void 0:D.description}}};const Be=["Default","NearlyFull","Unsupported"];export{s as Default,n as NearlyFull,i as Unsupported,Be as __namedExportsOrder,be as default};
