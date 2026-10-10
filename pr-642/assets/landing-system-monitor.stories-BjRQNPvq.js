import{b7 as R,b4 as s}from"./iframe-BgzrFP2X.js";import{i as S}from"./mock-fetch-aFrr3kfG.js";import{b as D,s as j}from"./index-CmaeQuNi.js";import{a as C,S as d}from"./system-metrics-DIw77SjU.js";import{u as L}from"./use-system-telemetry-9Sp_PxJM.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-D3c2qTfS.js";import"./chevron-down-qaYDqezv.js";import"./check-zxS8ESfU.js";import"./memory-stick-DDJAPReK.js";import"./use-system-stats-CKzTvwls.js";import"./useQuery-C1dtSrZF.js";import"./api-DB4WVoNn.js";function T(){const e=R("dashboard"),{cpu:i,ram:B,gpu:E,cpuNow:M,ramNow:U,gpuNow:A,available:N}=L();if(!N)return null;const c={cpu:{data:i,now:M},ram:{data:B,now:U},gpu:{data:E,now:A}},w=C.filter(a=>{var t;return((t=c[a])===null||t===void 0?void 0:t.data)!==null}),P=w.map(a=>({data:c[a].data,hueVar:d[a].hueVar}));return s.jsxs("div",{className:"absolute bottom-6 left-6 z-10 hidden text-left sm:block",children:[s.jsx("div",{className:"mb-2 flex items-center gap-4 text-xs",children:w.map(a=>{var t;return s.jsx(D,{hueVar:d[a].hueVar,label:e(d[a].labelKey),value:(t=c[a].now)!==null&&t!==void 0?t:0},a)})}),s.jsx(j,{series:P})]})}T.__docgenInfo={description:`The landing page's bottom-left host readout — the same CPU/RAM/GPU legend and
area chart the screensaver corner and the dashboard widget draw, so the three
agree on colour and wording (all three read \`SYSTEM_METRICS\`).

Renders nothing at all when the gateway can't report host metrics: the landing
is a calm surface, so an "unavailable" placeholder in the corner would be more
noise than the reading is worth. A metric the host can't measure (GPU on most
machines) is dropped from both the legend and the chart rather than plotted as
a flat zero — see \`useSystemTelemetry\`.`,methods:[],displayName:"LandingSystemMonitor"};var m,h,u,p,v,y,g,_,b,f;const{expect:l,waitFor:q,within:x}=__STORYBOOK_MODULE_TEST__,n=1024**3,G={cpu:{usagePct:37,cores:8,loadAvg1:1.24,model:"Test CPU"},memory:{totalBytes:16*n,usedBytes:9*n,freeBytes:7*n,usagePct:56},disks:[{path:"/",totalBytes:500*n,usedBytes:300*n,freeBytes:200*n,usagePct:60}],platform:"darwin",hostname:"test-host",uptimeSec:123456,sampledAt:"2026-06-23T12:00:00.000Z"},X={title:"Landing/LandingSystemMonitor",component:T,decorators:[e=>s.jsx("div",{className:"relative h-64 w-[36rem]",children:s.jsx(e,{})})]},r={beforeEach:()=>S([{match:"/system/stats",json:G}]),play:async({canvasElement:e})=>{const i=x(e);l(await i.findAllByText(/CPU/)).not.toHaveLength(0),l(i.getAllByText(/RAM/)).not.toHaveLength(0),l(e.querySelector("svg")).toBeTruthy()}},o={beforeEach:()=>S([{match:"/system/stats",status:503}]),play:async({canvasElement:e})=>{await q(()=>l(e.querySelector("svg")).toBeNull()),l(x(e).queryByText(/CPU/)).toBeNull()}};r.parameters={...r.parameters,docs:{...(m=r.parameters)===null||m===void 0?void 0:m.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/system/stats',
    json: STATS
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    expect(await canvas.findAllByText(/CPU/)).not.toHaveLength(0);
    expect(canvas.getAllByText(/RAM/)).not.toHaveLength(0);
    // The area chart renders as an inline SVG.
    expect(canvasElement.querySelector('svg')).toBeTruthy();
  }
}`,...(u=r.parameters)===null||u===void 0||(h=u.docs)===null||h===void 0?void 0:h.source},description:{story:"The bottom-left readout as it appears on the landing page.",...(v=r.parameters)===null||v===void 0||(p=v.docs)===null||p===void 0?void 0:p.description}}};o.parameters={...o.parameters,docs:{...(y=o.parameters)===null||y===void 0?void 0:y.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/system/stats',
    status: 503
  }]),
  play: async ({
    canvasElement
  }) => {
    // \`Default\` above is the control: the identical harness renders a legend and
    // an SVG once the stub returns stats, so an empty canvas here is the
    // unavailable branch rather than a story that never mounted.
    await waitFor(() => expect(canvasElement.querySelector('svg')).toBeNull());
    expect(within(canvasElement).queryByText(/CPU/)).toBeNull();
  }
}`,...(_=o.parameters)===null||_===void 0||(g=_.docs)===null||g===void 0?void 0:g.source},description:{story:`Gateway unreachable → the corner renders nothing at all. The landing is a calm
surface, so an "unavailable" placeholder would be more noise than the reading
is worth (the dashboard widget, which owns a card either way, does show one).`,...(f=o.parameters)===null||f===void 0||(b=f.docs)===null||b===void 0?void 0:b.description}}};const $=["Default","Unavailable"];export{r as Default,o as Unavailable,$ as __namedExportsOrder,X as default};
