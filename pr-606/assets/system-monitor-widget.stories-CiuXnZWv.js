import{bb as c,b2 as D,a$ as e}from"./iframe-C-gkDFgQ.js";import{i as M}from"./mock-fetch-aFrr3kfG.js";import{K as E,G as U}from"./index-DDe-Z3Ss.js";import{u as N,c as R}from"./dashboard-widget-labels-d43-bjLG.js";import{u as C}from"./use-system-stats-DY4XffgT.js";import{W as L}from"./widget-card-CRQOVwhL.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-CLkRzUuj.js";import"./chevron-down-5G1usU0g.js";import"./check-DX4g8Z9e.js";import"./star-Bd6cOL9z.js";import"./chart-line-D04CRfKt.js";import"./layout-grid-CrsG5wss.js";import"./globe-DRGU3OwP.js";import"./database-Cr-H1UJF.js";import"./rocket-B4WQRc1L.js";import"./newspaper-CnqSD4EK.js";import"./users-D3Gpxrvw.js";import"./folder-git-2-C2E17Zgl.js";import"./bot-B0T0dL9Q.js";import"./brain-DZbNbhlV.js";import"./workflow-8o0QCGdl.js";import"./square-terminal-GgLVdHSR.js";import"./clock-CERtnQNy.js";import"./sticky-note-Dx_vBe6u.js";import"./useQuery-BLzfYHny.js";import"./api-C-1Iqnef.js";const m=32;function W(){const{stats:t}=C(),[a,u]=c.useState(()=>Array(m).fill(0)),[d,p]=c.useState(()=>Array(m).fill(0)),o=c.useRef(null);return c.useEffect(()=>{if(!t||t.sampledAt===o.current)return;const l=o.current===null;o.current=t.sampledAt;const B=t.cpu.usagePct,A=t.memory.usagePct;u(h=>l?Array(m).fill(B):[...h.slice(1),B]),p(h=>l?Array(m).fill(A):[...h.slice(1),A])},[t]),{cpu:a,ram:d,cpuNow:t?Math.round(t.cpu.usagePct):0,ramNow:t?Math.round(t.memory.usagePct):0,available:!!t}}function j(){const t=D("dashboard"),a=N(),{cpu:u,ram:d,cpuNow:p,ramNow:o,available:l}=W();return e.jsx(L,{title:a.label("system-monitor"),icon:R,children:e.jsx("div",{className:"flex h-full flex-col items-center justify-center gap-3 p-4",children:l?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"flex items-center gap-4 text-xs",children:[e.jsx(E,{hueVar:"--status-wip",label:t("systemMonitor.cpu"),value:p}),e.jsx(E,{hueVar:"--status-todo",label:t("systemMonitor.ram"),value:o})]}),e.jsx(U,{cpu:u,ram:d,className:"h-auto w-full max-w-[260px]"})]}):e.jsx("p",{className:"px-2 text-center text-sm text-muted-foreground",children:t("systemMonitor.unavailable")})})})}j.__docgenInfo={description:"Dashboard counterpart to the screensaver's bottom-left CPU/RAM readout — the same\narea chart and legend, driven by the shared real host-telemetry hook\n(`GET /system/stats`).",methods:[],displayName:"SystemMonitorWidget"};var v,y,f,x,_,g,b,T,w,S;const{expect:i,within:P}=__STORYBOOK_MODULE_TEST__,s=1024**3,k={cpu:{usagePct:37,cores:8,loadAvg1:1.24,model:"Test CPU"},memory:{totalBytes:16*s,usedBytes:9*s,freeBytes:7*s,usagePct:56},disks:[{path:"/",totalBytes:500*s,usedBytes:300*s,freeBytes:200*s,usagePct:60}],platform:"darwin",hostname:"test-host",uptimeSec:123456,sampledAt:"2026-06-23T12:00:00.000Z"},dt={title:"Widgets/SystemMonitorWidget",component:j,decorators:[t=>e.jsx("div",{className:"h-64 w-80",children:e.jsx(t,{})})]},r={beforeEach:()=>M([{match:"/system/stats",json:k}]),play:async({canvasElement:t})=>{const a=P(t);await i(await a.findByText("System monitor")).toBeInTheDocument(),i(await a.findAllByText(/CPU/)).not.toHaveLength(0),i(a.getAllByText(/RAM/)).not.toHaveLength(0),i(t.querySelector("svg")).toBeTruthy()}},n={beforeEach:()=>M([{match:"/system/stats",status:503}]),play:async({canvasElement:t})=>{const a=P(t);await i(await a.findByText(/unavailable/i)).toBeInTheDocument()}};r.parameters={...r.parameters,docs:{...(v=r.parameters)===null||v===void 0?void 0:v.docs,source:{originalSource:`{
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
}`,...(f=r.parameters)===null||f===void 0||(y=f.docs)===null||y===void 0?void 0:y.source},description:{story:"Renders the real CPU/RAM monitor with its legend and area chart.",...(_=r.parameters)===null||_===void 0||(x=_.docs)===null||x===void 0?void 0:x.description}}};n.parameters={...n.parameters,docs:{...(g=n.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
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
}`,...(T=n.parameters)===null||T===void 0||(b=T.docs)===null||b===void 0?void 0:b.source},description:{story:'Gateway unreachable → the "unavailable" message rather than a fake chart.',...(S=n.parameters)===null||S===void 0||(w=S.docs)===null||w===void 0?void 0:w.description}}};const pt=["Default","Unavailable"];export{r as Default,n as Unavailable,pt as __namedExportsOrder,dt as default};
