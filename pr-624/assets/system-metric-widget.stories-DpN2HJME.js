import{b3 as F,b0 as t}from"./iframe-DvByxioD.js";import{i as l}from"./mock-fetch-aFrr3kfG.js";import{s as O,r as H}from"./index-C0qaSSk1.js";import{u as V}from"./dashboard-widget-labels-BOSfkOhe.js";import{S as K}from"./system-metrics-Dgaku5PG.js";import{u as Y}from"./use-system-telemetry-B8sv-7Yp.js";import{W as z}from"./widget-card-BH68fkuA.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-Ty80QyRq.js";import"./chevron-down-CrSnI0MB.js";import"./check-BmdAJ142.js";import"./star-D914R3ih.js";import"./chart-line-CtTMw__F.js";import"./layout-grid-qhsJBxJP.js";import"./globe-B0O-PvyN.js";import"./database-CV4e31CO.js";import"./memory-stick-BzqHZxT1.js";import"./rocket-CGsripyF.js";import"./newspaper-MgmnlOon.js";import"./users-qCRu5AxJ.js";import"./folder-git-2-C8B2xMmN.js";import"./bot-DFUKywUm.js";import"./brain-BwFknR46.js";import"./workflow-BjGf0Bl0.js";import"./square-terminal-Cp0OQre0.js";import"./clock-B_E3WFrs.js";import"./sticky-note-DvIHebvW.js";import"./use-system-stats-XRl-eMUw.js";import"./useQuery-M0a7EJvX.js";import"./api-D91Cefj8.js";function W({metric:e,widget:n}){const v=F("dashboard"),q=V(),a=Y(),p=K[e],y=a[e],I=e==="gpu"?a.gpuNow:e==="cpu"?a.cpuNow:a.ramNow,D=y?[{data:y,hueVar:p.hueVar}]:[];return t.jsx(z,{title:q.label(n),icon:p.icon,children:t.jsx("div",{className:"flex h-full flex-col items-center justify-center gap-3 p-4",children:a.available&&y&&I!==null?t.jsxs(t.Fragment,{children:[t.jsx("div",{className:"flex items-center gap-4 text-xs",children:t.jsx(O,{hueVar:p.hueVar,label:v(p.labelKey),value:I})}),t.jsx(H,{series:D,className:"h-auto w-full max-w-[260px]"}),e==="gpu"&&a.gpuName?t.jsx("span",{className:"max-w-full truncate text-[11px] text-muted-foreground",title:a.gpuName,children:a.gpuName}):null]}):t.jsx("p",{className:"px-2 text-center text-sm text-muted-foreground",children:e==="gpu"&&a.available?v("systemMonitor.gpuUnavailable"):v("systemMonitor.unavailable")})})})}W.__docgenInfo={description:`A single-metric rolling area chart — the CPU, RAM and GPU dashboard widgets are
all this component with a different \`metric\`, rather than three near-identical
files. Shares the telemetry hook (and therefore the poll) with the combined
System-monitor widget and the screensaver readout.

GPU is the only one that can be unavailable: hosts with no unprivileged GPU
interface report no series at all, and this says so rather than drawing a flat
line at zero.`,methods:[],displayName:"SystemMetricWidget",props:{metric:{required:!0,tsType:{name:"SystemMetric"},description:""},widget:{required:!0,tsType:{name:"WidgetType"},description:""}}};var g,_,w,x,f,b,T,S,B,U,G,E,A,P,M,j,N,C,R,k,L;const{expect:s,within:m}=__STORYBOOK_MODULE_TEST__,r=1024**3,h={cpu:{usagePct:37,cores:8,loadAvg1:1.24,model:"Test CPU"},memory:{totalBytes:16*r,usedBytes:9*r,freeBytes:7*r,usagePct:56},gpu:{usagePct:74,name:"Apple M2 Pro",memoryUsedBytes:.8*r,source:"ioreg"},disks:[{path:"/",totalBytes:500*r,usedBytes:300*r,freeBytes:200*r,usagePct:60}],platform:"darwin",hostname:"test-host",uptimeSec:123456,sampledAt:"2026-06-23T12:00:00.000Z"},Z={...h,gpu:void 0},Ue={title:"Widgets/SystemMetricWidget",component:W,decorators:[e=>t.jsx("div",{className:"h-64 w-80",children:t.jsx(e,{})})]},d={args:{metric:"cpu",widget:"cpu-monitor"},beforeEach:()=>l([{match:"/system/stats",json:h}]),play:async({canvasElement:e})=>{const n=m(e);s(await n.findAllByText(/CPU/)).not.toHaveLength(0),s(e.querySelector("svg")).toBeTruthy()}},u={args:{metric:"ram",widget:"ram-monitor"},beforeEach:()=>l([{match:"/system/stats",json:h}]),play:async({canvasElement:e})=>{s(await m(e).findAllByText(/RAM/)).not.toHaveLength(0)}},o={args:{metric:"gpu",widget:"gpu-monitor"},beforeEach:()=>l([{match:"/system/stats",json:h}]),play:async({canvasElement:e})=>{const n=m(e);s(await n.findAllByText(/GPU/)).not.toHaveLength(0),await s(await n.findByText("Apple M2 Pro")).toBeInTheDocument()}},i={args:{metric:"gpu",widget:"gpu-monitor"},beforeEach:()=>l([{match:"/system/stats",json:Z}]),play:async({canvasElement:e})=>{const n=m(e);await s(await n.findByText(/does not report GPU/i)).toBeInTheDocument(),s(e.querySelector('svg[viewBox="0 0 184 52"]')).toBeNull()}},c={args:{metric:"cpu",widget:"cpu-monitor"},beforeEach:()=>l([{match:"/system/stats",status:503}]),play:async({canvasElement:e})=>{await s(await m(e).findByText(/unavailable/i)).toBeInTheDocument()}};d.parameters={...d.parameters,docs:{...(g=d.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
  args: {
    metric: 'cpu',
    widget: 'cpu-monitor'
  },
  beforeEach: () => installMockFetch([{
    match: '/system/stats',
    json: STATS
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    expect(await canvas.findAllByText(/CPU/)).not.toHaveLength(0);
    expect(canvasElement.querySelector('svg')).toBeTruthy();
  }
}`,...(w=d.parameters)===null||w===void 0||(_=w.docs)===null||_===void 0?void 0:_.source}}};u.parameters={...u.parameters,docs:{...(x=u.parameters)===null||x===void 0?void 0:x.docs,source:{originalSource:`{
  args: {
    metric: 'ram',
    widget: 'ram-monitor'
  },
  beforeEach: () => installMockFetch([{
    match: '/system/stats',
    json: STATS
  }]),
  play: async ({
    canvasElement
  }) => {
    expect(await within(canvasElement).findAllByText(/RAM/)).not.toHaveLength(0);
  }
}`,...(b=u.parameters)===null||b===void 0||(f=b.docs)===null||f===void 0?void 0:f.source}}};o.parameters={...o.parameters,docs:{...(T=o.parameters)===null||T===void 0?void 0:T.docs,source:{originalSource:`{
  args: {
    metric: 'gpu',
    widget: 'gpu-monitor'
  },
  beforeEach: () => installMockFetch([{
    match: '/system/stats',
    json: STATS
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    expect(await canvas.findAllByText(/GPU/)).not.toHaveLength(0);
    await expect(await canvas.findByText('Apple M2 Pro')).toBeInTheDocument();
  }
}`,...(B=o.parameters)===null||B===void 0||(S=B.docs)===null||S===void 0?void 0:S.source},description:{story:"A host that reports GPU load — the adapter name renders under the chart.",...(G=o.parameters)===null||G===void 0||(U=G.docs)===null||U===void 0?void 0:U.description}}};i.parameters={...i.parameters,docs:{...(E=i.parameters)===null||E===void 0?void 0:E.docs,source:{originalSource:`{
  args: {
    metric: 'gpu',
    widget: 'gpu-monitor'
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
    // Match the chart by its intrinsic viewBox rather than by \`svg\` — the card
    // header's own icon is an SVG too, so a bare \`querySelector('svg')\` would
    // pass whether or not the chart rendered.
    expect(canvasElement.querySelector('svg[viewBox="0 0 184 52"]')).toBeNull();
  }
}`,...(P=i.parameters)===null||P===void 0||(A=P.docs)===null||A===void 0?void 0:A.source},description:{story:`A host with no readable GPU. The distinction that matters: this says so
explicitly rather than drawing a flat line at 0%, which would claim an idle
GPU nobody measured.`,...(j=i.parameters)===null||j===void 0||(M=j.docs)===null||M===void 0?void 0:M.description}}};c.parameters={...c.parameters,docs:{...(N=c.parameters)===null||N===void 0?void 0:N.docs,source:{originalSource:`{
  args: {
    metric: 'cpu',
    widget: 'cpu-monitor'
  },
  beforeEach: () => installMockFetch([{
    match: '/system/stats',
    status: 503
  }]),
  play: async ({
    canvasElement
  }) => {
    await expect(await within(canvasElement).findByText(/unavailable/i)).toBeInTheDocument();
  }
}`,...(R=c.parameters)===null||R===void 0||(C=R.docs)===null||C===void 0?void 0:C.source},description:{story:'Gateway unreachable → the "unavailable" message rather than a fake chart.',...(L=c.parameters)===null||L===void 0||(k=L.docs)===null||k===void 0?void 0:k.description}}};const Ge=["Cpu","Ram","Gpu","GpuUnavailable","Unavailable"];export{d as Cpu,o as Gpu,i as GpuUnavailable,u as Ram,c as Unavailable,Ge as __namedExportsOrder,Ue as default};
