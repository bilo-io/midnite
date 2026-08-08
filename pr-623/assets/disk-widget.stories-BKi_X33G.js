import{b3 as w,b0 as t}from"./iframe-pWg6ZGrB.js";import{i as B}from"./mock-fetch-aFrr3kfG.js";import{Z as U}from"./index-UGZ6tnU3.js";import{u as I,H as W}from"./dashboard-widget-labels-C-U_9HTG.js";import{u as A}from"./use-system-stats-TGdNUqf4.js";import{u as L}from"./use-unit-format-lfzmqLYt.js";import{W as G}from"./spinner-BUHLEDib.js";import{W as F}from"./widget-card-C4hY7wae.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-BqIheCCW.js";import"./chevron-down-Bg_Y5Vy9.js";import"./check-BiOl4hOc.js";import"./star-DIfKQgUb.js";import"./chart-line-4YE6MS2O.js";import"./layout-grid-Csbkz03y.js";import"./globe-CR1kMyUQ.js";import"./database-DPhCXaLX.js";import"./memory-stick-C5biFJIM.js";import"./rocket-Bd0TdNPm.js";import"./newspaper-CQ5XqLdQ.js";import"./users-PdpMU4VS.js";import"./folder-git-2-Ig6byRlE.js";import"./bot-C1iNwFgf.js";import"./brain-D6eDBZ8k.js";import"./workflow-CnyhAbwI.js";import"./square-terminal-Bz3I2JgO.js";import"./clock-BiK4yzy_.js";import"./sticky-note-CdyEPq1E.js";import"./folder-kanban-CaokFsEI.js";import"./useQuery-Cm_hkCGG.js";import"./api-Dcd-pKsf.js";import"./use-locale-format-BpcuPO3i.js";function b(){const a=w("dashboard"),e=w("common"),D=I(),{bytes:k}=L(),{stats:l,loading:S,error:E}=A();var m;const i=(m=l==null?void 0:l.disks[0])!==null&&m!==void 0?m:null,j={aria:s=>e("ui.gauge.pctUsed",{pct:s}),used:s=>e("ui.gauge.pctUsed",{pct:s}),of:s=>e("ui.gauge.ofTotal",{total:s}),free:s=>e("ui.gauge.free",{free:s}),bytes:k};return t.jsx(F,{title:D.label("disk"),icon:W,bodyClassName:"flex flex-col items-center justify-center gap-3 p-4",children:S?t.jsx(G,{}):E||!i?t.jsx("p",{className:"px-2 text-center text-sm text-muted-foreground",children:a("disk.unavailable")}):t.jsxs(t.Fragment,{children:[t.jsx(U,{usedBytes:i.usedBytes,totalBytes:i.totalBytes,labels:j}),t.jsx("span",{className:"max-w-full truncate font-mono text-[11px] text-muted-foreground",title:i.path,children:i.path})]})})}b.__docgenInfo={description:"Real device storage: the capacity of the filesystem hosting the gateway,\npolled from `GET /system/stats` (`node:fs.statfs`). Unlike the App-cache widget\n— which shows the browser's per-origin quota — this is the actual hard drive.",methods:[],displayName:"DiskWidget"};var d,p,u,h,v,f,y,g,_,x;const{expect:c,within:T}=__STORYBOOK_MODULE_TEST__,o=1024**3,N={cpu:{usagePct:12,cores:8,loadAvg1:.5},memory:{totalBytes:16*o,usedBytes:8*o,freeBytes:8*o,usagePct:50},disks:[{path:"/",totalBytes:500*o,usedBytes:300*o,freeBytes:200*o,usagePct:60}],platform:"darwin",uptimeSec:42e3,sampledAt:"2026-06-23T12:00:00.000Z"},fe={title:"Widgets/DiskWidget",component:b,decorators:[a=>t.jsx("div",{className:"h-80 w-72",children:t.jsx(a,{})})]},n={beforeEach:()=>B([{match:"/system/stats",json:N}]),play:async({canvasElement:a})=>{const e=T(a);await c(await e.findByText("Disk")).toBeInTheDocument(),await c(await e.findByText(/60% used/)).toBeInTheDocument(),await c(e.getByText("/")).toBeInTheDocument(),c(a.querySelectorAll("circle")).toHaveLength(2)}},r={beforeEach:()=>B([{match:"/system/stats",status:503}]),play:async({canvasElement:a})=>{const e=T(a);await c(await e.findByText(/unavailable/i)).toBeInTheDocument()}};n.parameters={...n.parameters,docs:{...(d=n.parameters)===null||d===void 0?void 0:d.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/system/stats',
    json: STATS
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Disk')).toBeInTheDocument();
    await expect(await canvas.findByText(/60% used/)).toBeInTheDocument();
    await expect(canvas.getByText('/')).toBeInTheDocument();
    // The gauge renders as an inline SVG with a track + progress ring.
    expect(canvasElement.querySelectorAll('circle')).toHaveLength(2);
  }
}`,...(u=n.parameters)===null||u===void 0||(p=u.docs)===null||p===void 0?void 0:p.source},description:{story:"300 GB of 500 GB used → 60%, with the mount path shown below.",...(v=n.parameters)===null||v===void 0||(h=v.docs)===null||h===void 0?void 0:h.description}}};r.parameters={...r.parameters,docs:{...(f=r.parameters)===null||f===void 0?void 0:f.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/system/stats',
    status: 503
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/unavailable/i)).toBeInTheDocument();
  }
}`,...(g=r.parameters)===null||g===void 0||(y=g.docs)===null||y===void 0?void 0:y.source},description:{story:'Gateway unreachable → the "unavailable" message.',...(x=r.parameters)===null||x===void 0||(_=x.docs)===null||_===void 0?void 0:_.description}}};const ye=["Default","Unavailable"];export{n as Default,r as Unavailable,ye as __namedExportsOrder,fe as default};
