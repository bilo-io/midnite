import{b4 as w,b1 as t}from"./iframe-C9h0ttrh.js";import{i as B}from"./mock-fetch-aFrr3kfG.js";import{Z as U}from"./index-BvhVIVWc.js";import{u as I,H as W}from"./dashboard-widget-labels-CKzQiorL.js";import{u as A}from"./use-system-stats-B0TRVE1B.js";import{u as L}from"./use-unit-format-Css5Rao6.js";import{W as G}from"./spinner-BVt7iuAA.js";import{W as F}from"./widget-card-BnzAkdMx.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-DqoSHntW.js";import"./chevron-down-BlzvwwV3.js";import"./check-CPgmd7PC.js";import"./star-MX52wPq-.js";import"./chart-line-BnmBgWgI.js";import"./layout-grid-doQCNAdC.js";import"./globe-B8-1cZis.js";import"./database-D1ErCCN2.js";import"./memory-stick-DtSAJM4i.js";import"./rocket-kVlA-PKy.js";import"./newspaper-DvIKgOxk.js";import"./users-BkaGWBbB.js";import"./folder-git-2-CAwSeEgA.js";import"./bot-10Pdjj9t.js";import"./brain-BVwnGqEX.js";import"./workflow-CL9pEKSp.js";import"./square-terminal-DnILHVpc.js";import"./clock-ELWF04KM.js";import"./sticky-note-BiVYgfw7.js";import"./useQuery-DBhUJx4Y.js";import"./api-BmZNK2cC.js";import"./use-locale-format--jP6Ej_d.js";function b(){const a=w("dashboard"),e=w("common"),D=I(),{bytes:k}=L(),{stats:l,loading:S,error:E}=A();var m;const i=(m=l==null?void 0:l.disks[0])!==null&&m!==void 0?m:null,j={aria:s=>e("ui.gauge.pctUsed",{pct:s}),used:s=>e("ui.gauge.pctUsed",{pct:s}),of:s=>e("ui.gauge.ofTotal",{total:s}),free:s=>e("ui.gauge.free",{free:s}),bytes:k};return t.jsx(F,{title:D.label("disk"),icon:W,bodyClassName:"flex flex-col items-center justify-center gap-3 p-4",children:S?t.jsx(G,{}):E||!i?t.jsx("p",{className:"px-2 text-center text-sm text-muted-foreground",children:a("disk.unavailable")}):t.jsxs(t.Fragment,{children:[t.jsx(U,{usedBytes:i.usedBytes,totalBytes:i.totalBytes,labels:j}),t.jsx("span",{className:"max-w-full truncate font-mono text-[11px] text-muted-foreground",title:i.path,children:i.path})]})})}b.__docgenInfo={description:"Real device storage: the capacity of the filesystem hosting the gateway,\npolled from `GET /system/stats` (`node:fs.statfs`). Unlike the App-cache widget\n— which shows the browser's per-origin quota — this is the actual hard drive.",methods:[],displayName:"DiskWidget"};var d,p,u,h,v,f,y,g,_,x;const{expect:c,within:T}=__STORYBOOK_MODULE_TEST__,o=1024**3,N={cpu:{usagePct:12,cores:8,loadAvg1:.5},memory:{totalBytes:16*o,usedBytes:8*o,freeBytes:8*o,usagePct:50},disks:[{path:"/",totalBytes:500*o,usedBytes:300*o,freeBytes:200*o,usagePct:60}],platform:"darwin",uptimeSec:42e3,sampledAt:"2026-06-23T12:00:00.000Z"},ve={title:"Widgets/DiskWidget",component:b,decorators:[a=>t.jsx("div",{className:"h-80 w-72",children:t.jsx(a,{})})]},n={beforeEach:()=>B([{match:"/system/stats",json:N}]),play:async({canvasElement:a})=>{const e=T(a);await c(await e.findByText("Disk")).toBeInTheDocument(),await c(await e.findByText(/60% used/)).toBeInTheDocument(),await c(e.getByText("/")).toBeInTheDocument(),c(a.querySelectorAll("circle")).toHaveLength(2)}},r={beforeEach:()=>B([{match:"/system/stats",status:503}]),play:async({canvasElement:a})=>{const e=T(a);await c(await e.findByText(/unavailable/i)).toBeInTheDocument()}};n.parameters={...n.parameters,docs:{...(d=n.parameters)===null||d===void 0?void 0:d.docs,source:{originalSource:`{
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
