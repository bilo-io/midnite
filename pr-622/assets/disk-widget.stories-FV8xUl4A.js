import{b3 as w,b0 as t}from"./iframe-CRXPy4mK.js";import{i as B}from"./mock-fetch-aFrr3kfG.js";import{Z as U}from"./index-DCHV2XZ2.js";import{u as I,H as W}from"./dashboard-widget-labels-BigRvoED.js";import{u as A}from"./use-system-stats-yGALyccC.js";import{u as L}from"./use-unit-format-BrAuhxOl.js";import{W as G}from"./spinner-Da_8PdhZ.js";import{W as F}from"./widget-card-CafZRdBR.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-CAHlbNH0.js";import"./chevron-down-CZEjkYQ1.js";import"./check-CJ1US0TT.js";import"./star-0XbfLa6d.js";import"./chart-line-D9rpDQL1.js";import"./layout-grid-BX4LmAZZ.js";import"./globe-B2CXmTY7.js";import"./database-Bji3431x.js";import"./memory-stick-BEWUf0U9.js";import"./rocket-DgN9KOGZ.js";import"./newspaper-Ce7SUt6V.js";import"./users-DimR4lO0.js";import"./folder-git-2-COV7Ad0I.js";import"./bot-csIRk4zo.js";import"./brain-BOtLSn3A.js";import"./workflow-BjoTiBvw.js";import"./square-terminal-3T6TzPwA.js";import"./clock-BTRcY547.js";import"./sticky-note-tncNIDae.js";import"./useQuery-B7CRXqut.js";import"./api-Cd0ChvyG.js";import"./use-locale-format-C1g7Psdh.js";function b(){const a=w("dashboard"),e=w("common"),D=I(),{bytes:k}=L(),{stats:l,loading:S,error:E}=A();var m;const i=(m=l==null?void 0:l.disks[0])!==null&&m!==void 0?m:null,j={aria:s=>e("ui.gauge.pctUsed",{pct:s}),used:s=>e("ui.gauge.pctUsed",{pct:s}),of:s=>e("ui.gauge.ofTotal",{total:s}),free:s=>e("ui.gauge.free",{free:s}),bytes:k};return t.jsx(F,{title:D.label("disk"),icon:W,bodyClassName:"flex flex-col items-center justify-center gap-3 p-4",children:S?t.jsx(G,{}):E||!i?t.jsx("p",{className:"px-2 text-center text-sm text-muted-foreground",children:a("disk.unavailable")}):t.jsxs(t.Fragment,{children:[t.jsx(U,{usedBytes:i.usedBytes,totalBytes:i.totalBytes,labels:j}),t.jsx("span",{className:"max-w-full truncate font-mono text-[11px] text-muted-foreground",title:i.path,children:i.path})]})})}b.__docgenInfo={description:"Real device storage: the capacity of the filesystem hosting the gateway,\npolled from `GET /system/stats` (`node:fs.statfs`). Unlike the App-cache widget\n— which shows the browser's per-origin quota — this is the actual hard drive.",methods:[],displayName:"DiskWidget"};var d,p,u,h,v,f,y,g,_,x;const{expect:c,within:T}=__STORYBOOK_MODULE_TEST__,o=1024**3,N={cpu:{usagePct:12,cores:8,loadAvg1:.5},memory:{totalBytes:16*o,usedBytes:8*o,freeBytes:8*o,usagePct:50},disks:[{path:"/",totalBytes:500*o,usedBytes:300*o,freeBytes:200*o,usagePct:60}],platform:"darwin",uptimeSec:42e3,sampledAt:"2026-06-23T12:00:00.000Z"},ve={title:"Widgets/DiskWidget",component:b,decorators:[a=>t.jsx("div",{className:"h-80 w-72",children:t.jsx(a,{})})]},n={beforeEach:()=>B([{match:"/system/stats",json:N}]),play:async({canvasElement:a})=>{const e=T(a);await c(await e.findByText("Disk")).toBeInTheDocument(),await c(await e.findByText(/60% used/)).toBeInTheDocument(),await c(e.getByText("/")).toBeInTheDocument(),c(a.querySelectorAll("circle")).toHaveLength(2)}},r={beforeEach:()=>B([{match:"/system/stats",status:503}]),play:async({canvasElement:a})=>{const e=T(a);await c(await e.findByText(/unavailable/i)).toBeInTheDocument()}};n.parameters={...n.parameters,docs:{...(d=n.parameters)===null||d===void 0?void 0:d.docs,source:{originalSource:`{
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
}`,...(g=r.parameters)===null||g===void 0||(y=g.docs)===null||y===void 0?void 0:y.source},description:{story:'Gateway unreachable → the "unavailable" message.',...(x=r.parameters)===null||x===void 0||(_=x.docs)===null||_===void 0?void 0:_.description}}};const fe=["Default","Unavailable"];export{n as Default,r as Unavailable,fe as __namedExportsOrder,ve as default};
