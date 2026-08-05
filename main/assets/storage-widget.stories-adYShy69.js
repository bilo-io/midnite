import{b1 as q,ba as d,a_ as o,aL as C}from"./iframe-CzW4mhwb.js";import{z as O}from"./index-CgQBr1Pd.js";import{u as R}from"./dashboard-widget-labels-BdAvfwtD.js";import{u as H}from"./use-unit-format-D0NhySX_.js";import{W as M}from"./spinner-C37ILLly.js";import{W as z}from"./widget-card-C7BUS7ZY.js";import{D as P}from"./database-BrSvq5oh.js";import{R as K}from"./refresh-cw-F_jABSKx.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-DMZqecfI.js";import"./chevron-down-DQyiikrp.js";import"./check-C_AEmsFb.js";import"./star-CR16NGgg.js";import"./chart-line-SwSXTEQN.js";import"./layout-grid-W8yl9e_T.js";import"./globe-Bfh7y07u.js";import"./rocket-BajeCrMB.js";import"./newspaper-DLSaxLrG.js";import"./users-QW3mIzM3.js";import"./folder-git-2-B9hvt5tA.js";import"./bot-CjilspNc.js";import"./brain-KdhMDYv4.js";import"./workflow-DNXBj_j0.js";import"./square-terminal-BQaWLVHK.js";import"./clock-aG7GHARr.js";import"./sticky-note-BjmlHczO.js";import"./use-locale-format-gbgt8KYj.js";function G(){const e=q("dashboard"),t=q("common"),L=R(),{bytes:W}=H(),[s,u]=d.useState(null),[F,I]=d.useState(!1),k={aria:a=>t("ui.gauge.pctUsed",{pct:a}),used:a=>t("ui.gauge.pctUsed",{pct:a}),of:a=>t("ui.gauge.ofTotal",{total:a}),free:a=>t("ui.gauge.free",{free:a}),bytes:W},p=d.useCallback(async()=>{var a;if(typeof navigator>"u"||!(!((a=navigator.storage)===null||a===void 0)&&a.estimate)){u("unsupported");return}I(!0);try{const{usage:U=0,quota:A=0}=await navigator.storage.estimate();u({usage:U,quota:A})}catch{u("error")}finally{I(!1)}},[]);return d.useEffect(()=>{p()},[p]),o.jsx(z,{title:L.label("storage"),icon:P,actions:o.jsx("button",{type:"button",onClick:()=>void p(),"aria-label":e("storage.refresh"),className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:o.jsx(K,{className:C("h-3 w-3",F&&"animate-spin")})}),bodyClassName:"flex flex-col items-center justify-center gap-3 p-4",children:s===null?o.jsx(M,{}):s==="unsupported"?o.jsx("p",{className:"px-2 text-center text-sm text-muted-foreground",children:e("storage.unsupported")}):s==="error"?o.jsx("p",{className:"px-2 text-center text-sm text-destructive",children:e("storage.error")}):o.jsx(O,{usedBytes:s.usage,totalBytes:s.quota,labels:k})})}G.__docgenInfo={description:`How much storage *this web app* has cached in the browser (IndexedDB /
CacheStorage), from the Storage Manager estimate — the origin's quota, which
browsers loosely derive from free disk space. This is app-level cache usage,
**not** the device's disk capacity; the Disk widget (gateway \`fs.statfs\`) shows
real hard-drive space. Titled "App cache" to keep the two distinct.`,methods:[],displayName:"StorageWidget"};var m,v,g,f,h,y,_,x,w,b,B,T,E,D,S;const{expect:c,within:N}=__STORYBOOK_MODULE_TEST__;function j(e){Object.defineProperty(navigator,"storage",{configurable:!0,value:e?{estimate:async()=>e}:void 0})}const l=1024**3,xe={title:"Widgets/StorageWidget",component:G,decorators:[e=>o.jsx("div",{className:"h-80 w-72",children:o.jsx(e,{})})]},r={beforeEach:()=>j({usage:42*l,quota:128*l}),play:async({canvasElement:e})=>{const t=N(e);await c(await t.findByText("App cache")).toBeInTheDocument(),await c(await t.findByText(/33% used/)).toBeInTheDocument(),c(e.querySelectorAll("circle")).toHaveLength(2)}},n={beforeEach:()=>j({usage:120*l,quota:128*l}),play:async({canvasElement:e})=>{const t=N(e);await c(await t.findByText(/94% used/)).toBeInTheDocument()}},i={beforeEach:()=>j(void 0),play:async({canvasElement:e})=>{const t=N(e);await c(await t.findByText(/aren’t available/)).toBeInTheDocument()}};r.parameters={...r.parameters,docs:{...(m=r.parameters)===null||m===void 0?void 0:m.docs,source:{originalSource:`{
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
}`,...(g=r.parameters)===null||g===void 0||(v=g.docs)===null||v===void 0?void 0:v.source},description:{story:"A partly-full quota: ~42 GB of 128 GB used → 33%.",...(h=r.parameters)===null||h===void 0||(f=h.docs)===null||f===void 0?void 0:f.description}}};n.parameters={...n.parameters,docs:{...(y=n.parameters)===null||y===void 0?void 0:y.docs,source:{originalSource:`{
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
}`,...(E=i.parameters)===null||E===void 0||(T=E.docs)===null||T===void 0?void 0:T.source},description:{story:"No Storage Manager API → the unsupported message.",...(S=i.parameters)===null||S===void 0||(D=S.docs)===null||D===void 0?void 0:D.description}}};const we=["Default","NearlyFull","Unsupported"];export{r as Default,n as NearlyFull,i as Unsupported,we as __namedExportsOrder,xe as default};
