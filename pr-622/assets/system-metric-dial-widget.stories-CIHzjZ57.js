import{b3 as q,b0 as o}from"./iframe-CRXPy4mK.js";import{i as l}from"./mock-fetch-aFrr3kfG.js";import{J as L}from"./index-DCHV2XZ2.js";import{u as J}from"./dashboard-widget-labels-BigRvoED.js";import{S as K}from"./system-metrics-B1Ye1y1O.js";import{u as V}from"./use-system-stats-yGALyccC.js";import{u as Y}from"./use-unit-format-BrAuhxOl.js";import{W as Q}from"./spinner-Da_8PdhZ.js";import{W as Z}from"./widget-card-CafZRdBR.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-CAHlbNH0.js";import"./chevron-down-CZEjkYQ1.js";import"./check-CJ1US0TT.js";import"./star-0XbfLa6d.js";import"./chart-line-D9rpDQL1.js";import"./layout-grid-BX4LmAZZ.js";import"./globe-B2CXmTY7.js";import"./database-Bji3431x.js";import"./memory-stick-BEWUf0U9.js";import"./rocket-DgN9KOGZ.js";import"./newspaper-Ce7SUt6V.js";import"./users-DimR4lO0.js";import"./folder-git-2-COV7Ad0I.js";import"./bot-csIRk4zo.js";import"./brain-BOtLSn3A.js";import"./workflow-BjoTiBvw.js";import"./square-terminal-3T6TzPwA.js";import"./clock-BTRcY547.js";import"./sticky-note-tncNIDae.js";import"./useQuery-B7CRXqut.js";import"./api-Cd0ChvyG.js";import"./use-locale-format-C1g7Psdh.js";function W({metric:e,widget:t}){const r=q("dashboard"),N=J(),{bytes:R}=Y(),{stats:a,loading:O,error:F}=V(),h=K[e],y=(()=>{if(!a)return null;if(e==="cpu")return{pct:a.cpu.usagePct,sublabel:r("systemMonitor.cores",{count:a.cpu.cores})};if(e==="ram")return{pct:a.memory.usagePct,sublabel:r("systemMonitor.memoryOf",{used:R(a.memory.usedBytes),total:R(a.memory.totalBytes)})};if(!a.gpu)return null;var g;return{pct:a.gpu.usagePct,sublabel:(g=a.gpu.name)!==null&&g!==void 0?g:void 0}})();return o.jsx(Z,{title:N.label(t),icon:h.icon,bodyClassName:"flex flex-col items-center justify-center gap-3 p-4",children:O?o.jsx(Q,{}):F||!y?o.jsx("p",{className:"px-2 text-center text-sm text-muted-foreground",children:r(e==="gpu"&&a?"systemMonitor.gpuUnavailable":"systemMonitor.unavailable")}):o.jsx(L,{pct:y.pct,label:r(h.labelKey),hueVar:h.hueVar,sublabel:y.sublabel})})}W.__docgenInfo={description:`The dial counterpart to {@link SystemMetricWidget} — the same three metrics as
a ring gauge instead of a rolling chart, matching how the Disk and App-cache
widgets read. Centre shows the percentage, the label underneath names the
metric, and the sublabel carries whatever supporting figure that metric has.

This reads \`useSystemStats\` directly rather than the telemetry hook: a dial
shows the instant, not the history, so it has no use for the rolling series.
Both sit on the same TanStack Query key, so mounting dials and charts together
still polls the host once.`,methods:[],displayName:"SystemMetricDialWidget",props:{metric:{required:!0,tsType:{name:"SystemMetric"},description:""},widget:{required:!0,tsType:{name:"WidgetType"},description:""}}};var v,_,T,w,f,b,B,x,S,E,G,M,U,P,D,j,I,A,C,k;const{expect:n,within:d}=__STORYBOOK_MODULE_TEST__,s=1024**3,u={cpu:{usagePct:37,cores:8,loadAvg1:1.24,model:"Test CPU"},memory:{totalBytes:16*s,usedBytes:9*s,freeBytes:7*s,usagePct:56},gpu:{usagePct:74,name:"Apple M2 Pro",memoryUsedBytes:.8*s,source:"ioreg"},disks:[{path:"/",totalBytes:500*s,usedBytes:300*s,freeBytes:200*s,usagePct:60}],platform:"darwin",hostname:"test-host",uptimeSec:123456,sampledAt:"2026-06-23T12:00:00.000Z"},z={...u,gpu:void 0},Ue={title:"Widgets/SystemMetricDialWidget",component:W,decorators:[e=>o.jsx("div",{className:"h-72 w-64",children:o.jsx(e,{})})]},i={args:{metric:"cpu",widget:"cpu-dial"},beforeEach:()=>l([{match:"/system/stats",json:u}]),play:async({canvasElement:e})=>{const t=d(e);await n(await t.findByText("37%")).toBeInTheDocument(),await n(await t.findByText("8 cores")).toBeInTheDocument()}},c={args:{metric:"ram",widget:"ram-dial"},beforeEach:()=>l([{match:"/system/stats",json:u}]),play:async({canvasElement:e})=>{await n(await d(e).findByText("56%")).toBeInTheDocument()}},m={args:{metric:"gpu",widget:"gpu-dial"},beforeEach:()=>l([{match:"/system/stats",json:u}]),play:async({canvasElement:e})=>{const t=d(e);await n(await t.findByText("74%")).toBeInTheDocument(),await n(await t.findByText("Apple M2 Pro")).toBeInTheDocument()}},p={args:{metric:"gpu",widget:"gpu-dial"},beforeEach:()=>l([{match:"/system/stats",json:z}]),play:async({canvasElement:e})=>{const t=d(e);await n(await t.findByText(/does not report GPU/i)).toBeInTheDocument(),n(t.queryByText("0%")).toBeNull()}};i.parameters={...i.parameters,docs:{...(v=i.parameters)===null||v===void 0?void 0:v.docs,source:{originalSource:`{
  args: {
    metric: 'cpu',
    widget: 'cpu-dial'
  },
  beforeEach: () => installMockFetch([{
    match: '/system/stats',
    json: STATS
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('37%')).toBeInTheDocument();
    await expect(await canvas.findByText('8 cores')).toBeInTheDocument();
  }
}`,...(T=i.parameters)===null||T===void 0||(_=T.docs)===null||_===void 0?void 0:_.source},description:{story:"CPU, with the core count as the supporting sublabel.",...(f=i.parameters)===null||f===void 0||(w=f.docs)===null||w===void 0?void 0:w.description}}};c.parameters={...c.parameters,docs:{...(b=c.parameters)===null||b===void 0?void 0:b.docs,source:{originalSource:`{
  args: {
    metric: 'ram',
    widget: 'ram-dial'
  },
  beforeEach: () => installMockFetch([{
    match: '/system/stats',
    json: STATS
  }]),
  play: async ({
    canvasElement
  }) => {
    await expect(await within(canvasElement).findByText('56%')).toBeInTheDocument();
  }
}`,...(x=c.parameters)===null||x===void 0||(B=x.docs)===null||B===void 0?void 0:B.source},description:{story:"RAM, with used-of-total underneath.",...(E=c.parameters)===null||E===void 0||(S=E.docs)===null||S===void 0?void 0:S.description}}};m.parameters={...m.parameters,docs:{...(G=m.parameters)===null||G===void 0?void 0:G.docs,source:{originalSource:`{
  args: {
    metric: 'gpu',
    widget: 'gpu-dial'
  },
  beforeEach: () => installMockFetch([{
    match: '/system/stats',
    json: STATS
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('74%')).toBeInTheDocument();
    await expect(await canvas.findByText('Apple M2 Pro')).toBeInTheDocument();
  }
}`,...(U=m.parameters)===null||U===void 0||(M=U.docs)===null||M===void 0?void 0:M.source},description:{story:"GPU, with the adapter name underneath.",...(D=m.parameters)===null||D===void 0||(P=D.docs)===null||P===void 0?void 0:P.description}}};p.parameters={...p.parameters,docs:{...(j=p.parameters)===null||j===void 0?void 0:j.docs,source:{originalSource:`{
  args: {
    metric: 'gpu',
    widget: 'gpu-dial'
  },
  beforeEach: () => installMockFetch([{
    match: '/system/stats',
    json: STATS_NO_GPU
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/does not report GPU/i)).toBeInTheDocument();
    expect(canvas.queryByText('0%')).toBeNull();
  }
}`,...(A=p.parameters)===null||A===void 0||(I=A.docs)===null||I===void 0?void 0:I.source},description:{story:"No readable GPU → say so, rather than showing an empty ring reading 0%.",...(k=p.parameters)===null||k===void 0||(C=k.docs)===null||C===void 0?void 0:C.description}}};const Pe=["Cpu","Ram","Gpu","GpuUnavailable"];export{i as Cpu,m as Gpu,p as GpuUnavailable,c as Ram,Pe as __namedExportsOrder,Ue as default};
