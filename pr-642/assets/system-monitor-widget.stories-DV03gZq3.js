import{b7 as C,b4 as e}from"./iframe-BgzrFP2X.js";import{i as b}from"./mock-fetch-aFrr3kfG.js";import{b as P,s as N}from"./index-CmaeQuNi.js";import{u as k}from"./dashboard-widget-labels-B2tY1ceP.js";import{a as I,S as m}from"./system-metrics-DIw77SjU.js";import{u as L}from"./use-system-telemetry-9Sp_PxJM.js";import{W}from"./widget-card-BGTBOIi5.js";import{C as G}from"./memory-stick-DDJAPReK.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-D3c2qTfS.js";import"./chevron-down-qaYDqezv.js";import"./check-zxS8ESfU.js";import"./star-BMaOOn5x.js";import"./chart-line-4eyueXHO.js";import"./layout-grid-DGeGSYRJ.js";import"./globe-DO3SgpXC.js";import"./database-DarwPU4u.js";import"./rocket-D5ooRLZr.js";import"./newspaper-CsxxJNKz.js";import"./users-nVZNJiYP.js";import"./folder-git-2-CqSRF3Xn.js";import"./bot-3BU_codW.js";import"./brain-1L8t2Clf.js";import"./workflow-BttUnRUb.js";import"./square-terminal-CwoQA1lS.js";import"./clock-BaIWqBKq.js";import"./sticky-note-U_zdojnF.js";import"./folder-kanban-C46T-WBo.js";import"./use-system-stats-CKzTvwls.js";import"./useQuery-C1dtSrZF.js";import"./api-DB4WVoNn.js";function T(){const t=C("dashboard"),s=k(),{cpu:B,ram:E,gpu:M,cpuNow:U,ramNow:j,gpuNow:D,available:A}=L(),c={cpu:{data:B,now:U},ram:{data:E,now:j},gpu:{data:M,now:D}},w=I.filter(a=>{var o;return((o=c[a])===null||o===void 0?void 0:o.data)!==null}),R=w.map(a=>({data:c[a].data,hueVar:m[a].hueVar}));return e.jsx(W,{title:s.label("system-monitor"),icon:G,children:e.jsx("div",{className:"flex h-full flex-col items-center justify-center gap-3 p-4",children:A?e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"flex items-center gap-4 text-xs",children:w.map(a=>{var o;return e.jsx(P,{hueVar:m[a].hueVar,label:t(m[a].labelKey),value:(o=c[a].now)!==null&&o!==void 0?o:0},a)})}),e.jsx(N,{series:R,className:"h-auto w-full max-w-[260px]"})]}):e.jsx("p",{className:"px-2 text-center text-sm text-muted-foreground",children:t("systemMonitor.unavailable")})})})}T.__docgenInfo={description:`Dashboard counterpart to the screensaver's bottom-left CPU/RAM/GPU readout — the
same area chart and legend, driven by the shared real host-telemetry hook
(\`GET /system/stats\`).

GPU joins the chart only on hosts that can report it; elsewhere this stays the
two-series CPU/RAM chart it has always been, rather than plotting a flat zero
for a measurement that was never taken.`,methods:[],displayName:"SystemMonitorWidget"};var d,p,u,h,v,y,f,_,x,g;const{expect:l,within:S}=__STORYBOOK_MODULE_TEST__,r=1024**3,O={cpu:{usagePct:37,cores:8,loadAvg1:1.24,model:"Test CPU"},memory:{totalBytes:16*r,usedBytes:9*r,freeBytes:7*r,usagePct:56},disks:[{path:"/",totalBytes:500*r,usedBytes:300*r,freeBytes:200*r,usagePct:60}],platform:"darwin",hostname:"test-host",uptimeSec:123456,sampledAt:"2026-06-23T12:00:00.000Z"},xe={title:"Widgets/SystemMonitorWidget",component:T,decorators:[t=>e.jsx("div",{className:"h-64 w-80",children:e.jsx(t,{})})]},n={beforeEach:()=>b([{match:"/system/stats",json:O}]),play:async({canvasElement:t})=>{const s=S(t);await l(await s.findByText("System monitor")).toBeInTheDocument(),l(await s.findAllByText(/CPU/)).not.toHaveLength(0),l(s.getAllByText(/RAM/)).not.toHaveLength(0),l(t.querySelector("svg")).toBeTruthy()}},i={beforeEach:()=>b([{match:"/system/stats",status:503}]),play:async({canvasElement:t})=>{const s=S(t);await l(await s.findByText(/unavailable/i)).toBeInTheDocument()}};n.parameters={...n.parameters,docs:{...(d=n.parameters)===null||d===void 0?void 0:d.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/system/stats',
    json: STATS
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('System monitor')).toBeInTheDocument();
    expect(await canvas.findAllByText(/CPU/)).not.toHaveLength(0);
    expect(canvas.getAllByText(/RAM/)).not.toHaveLength(0);
    // The area chart renders as an inline SVG.
    expect(canvasElement.querySelector('svg')).toBeTruthy();
  }
}`,...(u=n.parameters)===null||u===void 0||(p=u.docs)===null||p===void 0?void 0:p.source},description:{story:"Renders the real CPU/RAM monitor with its legend and area chart.",...(v=n.parameters)===null||v===void 0||(h=v.docs)===null||h===void 0?void 0:h.description}}};i.parameters={...i.parameters,docs:{...(y=i.parameters)===null||y===void 0?void 0:y.docs,source:{originalSource:`{
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
}`,...(_=i.parameters)===null||_===void 0||(f=_.docs)===null||f===void 0?void 0:f.source},description:{story:'Gateway unreachable → the "unavailable" message rather than a fake chart.',...(g=i.parameters)===null||g===void 0||(x=g.docs)===null||x===void 0?void 0:x.description}}};const ge=["Default","Unavailable"];export{n as Default,i as Unavailable,ge as __namedExportsOrder,xe as default};
