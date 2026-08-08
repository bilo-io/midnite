import{b3 as q,bc as d,b0 as o,aN as C}from"./iframe-DvByxioD.js";import{Z as O}from"./index-C0qaSSk1.js";import{u as R}from"./dashboard-widget-labels-BOSfkOhe.js";import{u as H}from"./use-unit-format-BWWLw1i1.js";import{W as M}from"./spinner-D_PC8i-G.js";import{W as P}from"./widget-card-BH68fkuA.js";import{D as Z}from"./database-CV4e31CO.js";import{R as K}from"./refresh-cw-DHXuwzIv.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-Ty80QyRq.js";import"./chevron-down-CrSnI0MB.js";import"./check-BmdAJ142.js";import"./star-D914R3ih.js";import"./chart-line-CtTMw__F.js";import"./layout-grid-qhsJBxJP.js";import"./globe-B0O-PvyN.js";import"./memory-stick-BzqHZxT1.js";import"./rocket-CGsripyF.js";import"./newspaper-MgmnlOon.js";import"./users-qCRu5AxJ.js";import"./folder-git-2-C8B2xMmN.js";import"./bot-DFUKywUm.js";import"./brain-BwFknR46.js";import"./workflow-BjGf0Bl0.js";import"./square-terminal-Cp0OQre0.js";import"./clock-B_E3WFrs.js";import"./sticky-note-DvIHebvW.js";import"./use-locale-format-DEUtL6FT.js";function G(){const e=q("dashboard"),t=q("common"),W=R(),{bytes:F}=H(),[s,u]=d.useState(null),[L,I]=d.useState(!1),k={aria:a=>t("ui.gauge.pctUsed",{pct:a}),used:a=>t("ui.gauge.pctUsed",{pct:a}),of:a=>t("ui.gauge.ofTotal",{total:a}),free:a=>t("ui.gauge.free",{free:a}),bytes:F},p=d.useCallback(async()=>{var a;if(typeof navigator>"u"||!(!((a=navigator.storage)===null||a===void 0)&&a.estimate)){u("unsupported");return}I(!0);try{const{usage:U=0,quota:A=0}=await navigator.storage.estimate();u({usage:U,quota:A})}catch{u("error")}finally{I(!1)}},[]);return d.useEffect(()=>{p()},[p]),o.jsx(P,{title:W.label("storage"),icon:Z,actions:o.jsx("button",{type:"button",onClick:()=>void p(),"aria-label":e("storage.refresh"),className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:o.jsx(K,{className:C("h-3 w-3",L&&"animate-spin")})}),bodyClassName:"flex flex-col items-center justify-center gap-3 p-4",children:s===null?o.jsx(M,{}):s==="unsupported"?o.jsx("p",{className:"px-2 text-center text-sm text-muted-foreground",children:e("storage.unsupported")}):s==="error"?o.jsx("p",{className:"px-2 text-center text-sm text-destructive",children:e("storage.error")}):o.jsx(O,{usedBytes:s.usage,totalBytes:s.quota,labels:k})})}G.__docgenInfo={description:`How much storage *this web app* has cached in the browser (IndexedDB /
CacheStorage), from the Storage Manager estimate — the origin's quota, which
browsers loosely derive from free disk space. This is app-level cache usage,
**not** the device's disk capacity; the Disk widget (gateway \`fs.statfs\`) shows
real hard-drive space. Titled "App cache" to keep the two distinct.`,methods:[],displayName:"StorageWidget"};var m,v,g,f,h,y,_,x,w,b,B,T,E,D,N;const{expect:c,within:S}=__STORYBOOK_MODULE_TEST__;function j(e){Object.defineProperty(navigator,"storage",{configurable:!0,value:e?{estimate:async()=>e}:void 0})}const l=1024**3,we={title:"Widgets/StorageWidget",component:G,decorators:[e=>o.jsx("div",{className:"h-80 w-72",children:o.jsx(e,{})})]},r={beforeEach:()=>j({usage:42*l,quota:128*l}),play:async({canvasElement:e})=>{const t=S(e);await c(await t.findByText("App cache")).toBeInTheDocument(),await c(await t.findByText(/33% used/)).toBeInTheDocument(),c(e.querySelectorAll("circle")).toHaveLength(2)}},n={beforeEach:()=>j({usage:120*l,quota:128*l}),play:async({canvasElement:e})=>{const t=S(e);await c(await t.findByText(/94% used/)).toBeInTheDocument()}},i={beforeEach:()=>j(void 0),play:async({canvasElement:e})=>{const t=S(e);await c(await t.findByText(/aren’t available/)).toBeInTheDocument()}};r.parameters={...r.parameters,docs:{...(m=r.parameters)===null||m===void 0?void 0:m.docs,source:{originalSource:`{
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
}`,...(E=i.parameters)===null||E===void 0||(T=E.docs)===null||T===void 0?void 0:T.source},description:{story:"No Storage Manager API → the unsupported message.",...(N=i.parameters)===null||N===void 0||(D=N.docs)===null||D===void 0?void 0:D.description}}};const be=["Default","NearlyFull","Unsupported"];export{r as Default,n as NearlyFull,i as Unsupported,be as __namedExportsOrder,we as default};
