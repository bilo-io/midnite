import{b3 as P,b0 as e}from"./iframe-BUTs4p2n.js";import{i as T}from"./mock-fetch-aFrr3kfG.js";import{s as C,r as N}from"./index-DN7i53wW.js";import{u as k,c as I}from"./dashboard-widget-labels-CkYeppV1.js";import{a as L,S as m}from"./system-metrics-CmwoDQr3.js";import{u as W}from"./use-system-telemetry-DELxoLj5.js";import{W as G}from"./widget-card-BMbzMuYX.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-Dn8NC-WJ.js";import"./chevron-down-DpHboeLV.js";import"./check-D-2Oq7Gr.js";import"./star-DPCW2R_p.js";import"./chart-line-CDaXtip8.js";import"./layout-grid-Dx4OjJhi.js";import"./globe-BNYnR_Q8.js";import"./database-Dm_LwFzm.js";import"./rocket-BN0-BGEH.js";import"./newspaper-B91K9WYJ.js";import"./users-De9Fve3X.js";import"./folder-git-2-BdfeLZjB.js";import"./bot-D1D36Iue.js";import"./brain-CjJT4Ku4.js";import"./workflow-BzfLrIzB.js";import"./square-terminal-BELudxrR.js";import"./clock-R3oxOPB_.js";import"./sticky-note-Cc0wHSHN.js";import"./use-system-stats-D1lHWozt.js";import"./useQuery-cR3K73A4.js";import"./api-X8diawYb.js";function b(){const t=P("dashboard"),s=k(),{cpu:B,ram:E,gpu:M,cpuNow:U,ramNow:j,gpuNow:D,available:A}=W(),c={cpu:{data:B,now:U},ram:{data:E,now:j},gpu:{data:M,now:D}},w=L.filter(a=>{var o;return((o=c[a])===null||o===void 0?void 0:o.data)!==null}),R=w.map(a=>({data:c[a].data,hueVar:m[a].hueVar}));return e.jsx(G,{title:s.label("system-monitor"),icon:I,children:e.jsx("div",{className:"flex h-full flex-col items-center justify-center gap-3 p-4",children:A?e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"flex items-center gap-4 text-xs",children:w.map(a=>{var o;return e.jsx(C,{hueVar:m[a].hueVar,label:t(m[a].labelKey),value:(o=c[a].now)!==null&&o!==void 0?o:0},a)})}),e.jsx(N,{series:R,className:"h-auto w-full max-w-[260px]"})]}):e.jsx("p",{className:"px-2 text-center text-sm text-muted-foreground",children:t("systemMonitor.unavailable")})})})}b.__docgenInfo={description:`Dashboard counterpart to the screensaver's bottom-left CPU/RAM/GPU readout — the
same area chart and legend, driven by the shared real host-telemetry hook
(\`GET /system/stats\`).

GPU joins the chart only on hosts that can report it; elsewhere this stays the
two-series CPU/RAM chart it has always been, rather than plotting a flat zero
for a measurement that was never taken.`,methods:[],displayName:"SystemMonitorWidget"};var d,p,u,h,v,y,f,_,x,g;const{expect:l,within:S}=__STORYBOOK_MODULE_TEST__,r=1024**3,O={cpu:{usagePct:37,cores:8,loadAvg1:1.24,model:"Test CPU"},memory:{totalBytes:16*r,usedBytes:9*r,freeBytes:7*r,usagePct:56},disks:[{path:"/",totalBytes:500*r,usedBytes:300*r,freeBytes:200*r,usagePct:60}],platform:"darwin",hostname:"test-host",uptimeSec:123456,sampledAt:"2026-06-23T12:00:00.000Z"},fe={title:"Widgets/SystemMonitorWidget",component:b,decorators:[t=>e.jsx("div",{className:"h-64 w-80",children:e.jsx(t,{})})]},n={beforeEach:()=>T([{match:"/system/stats",json:O}]),play:async({canvasElement:t})=>{const s=S(t);await l(await s.findByText("System monitor")).toBeInTheDocument(),l(await s.findAllByText(/CPU/)).not.toHaveLength(0),l(s.getAllByText(/RAM/)).not.toHaveLength(0),l(t.querySelector("svg")).toBeTruthy()}},i={beforeEach:()=>T([{match:"/system/stats",status:503}]),play:async({canvasElement:t})=>{const s=S(t);await l(await s.findByText(/unavailable/i)).toBeInTheDocument()}};n.parameters={...n.parameters,docs:{...(d=n.parameters)===null||d===void 0?void 0:d.docs,source:{originalSource:`{
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
}`,...(_=i.parameters)===null||_===void 0||(f=_.docs)===null||f===void 0?void 0:f.source},description:{story:'Gateway unreachable → the "unavailable" message rather than a fake chart.',...(g=i.parameters)===null||g===void 0||(x=g.docs)===null||x===void 0?void 0:x.description}}};const _e=["Default","Unavailable"];export{n as Default,i as Unavailable,_e as __namedExportsOrder,fe as default};
