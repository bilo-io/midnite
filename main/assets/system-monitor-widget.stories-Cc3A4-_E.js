import{aI as P,b2 as c,aU as t}from"./iframe-Q5gA5LgF.js";import{i as A}from"./mock-fetch-aFrr3kfG.js";import{g as k,f as U}from"./index-UlzLH2B7.js";import{u as D}from"./use-system-stats-DRLVNANj.js";import{W as N}from"./widget-card-OYtvIXOC.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-BYHOCdpE.js";import"./chevron-down-D7CAMhlG.js";import"./check-DBlKvffa.js";import"./useQuery-CSigHBub.js";import"./api-Der6T2Mz.js";/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const R=[["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M17 20v2",key:"1rnc9c"}],["path",{d:"M17 2v2",key:"11trls"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M2 17h2",key:"7oei6x"}],["path",{d:"M2 7h2",key:"asdhe0"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"M20 17h2",key:"1fpfkl"}],["path",{d:"M20 7h2",key:"1o8tra"}],["path",{d:"M7 20v2",key:"4gnj0m"}],["path",{d:"M7 2v2",key:"1i4yhu"}],["rect",{x:"4",y:"4",width:"16",height:"16",rx:"2",key:"1vbyd7"}],["rect",{x:"8",y:"8",width:"8",height:"8",rx:"1",key:"z9xiuo"}]],C=P("cpu",R),l=32;function I(){const{stats:e}=D(),[a,i]=c.useState(()=>Array(l).fill(0)),[m,d]=c.useState(()=>Array(l).fill(0)),u=c.useRef(null);return c.useEffect(()=>{if(!e||e.sampledAt===u.current)return;const T=u.current===null;u.current=e.sampledAt;const b=e.cpu.usagePct,B=e.memory.usagePct;i(p=>T?Array(l).fill(b):[...p.slice(1),b]),d(p=>T?Array(l).fill(B):[...p.slice(1),B])},[e]),{cpu:a,ram:m,cpuNow:e?Math.round(e.cpu.usagePct):0,ramNow:e?Math.round(e.memory.usagePct):0,available:!!e}}function E(){const{cpu:e,ram:a,cpuNow:i,ramNow:m,available:d}=I();return t.jsx(N,{title:"System monitor",icon:C,children:t.jsx("div",{className:"flex h-full flex-col items-center justify-center gap-3 p-4",children:d?t.jsxs(t.Fragment,{children:[t.jsxs("div",{className:"flex items-center gap-4 text-xs",children:[t.jsx(k,{hueVar:"--status-wip",label:"CPU",value:i}),t.jsx(k,{hueVar:"--status-todo",label:"RAM",value:m})]}),t.jsx(U,{cpu:e,ram:a,className:"h-auto w-full max-w-[260px]"})]}):t.jsx("p",{className:"px-2 text-center text-sm text-muted-foreground",children:"Host metrics are unavailable."})})})}E.__docgenInfo={description:"Dashboard counterpart to the screensaver's bottom-left CPU/RAM readout — the same\narea chart and legend, driven by the shared real host-telemetry hook\n(`GET /system/stats`).",methods:[],displayName:"SystemMonitorWidget"};var h,y,v,f,x,g,_,w,M,S;const{expect:r,within:j}=__STORYBOOK_MODULE_TEST__,s=1024**3,L={cpu:{usagePct:37,cores:8,loadAvg1:1.24,model:"Test CPU"},memory:{totalBytes:16*s,usedBytes:9*s,freeBytes:7*s,usagePct:56},disks:[{path:"/",totalBytes:500*s,usedBytes:300*s,freeBytes:200*s,usagePct:60}],platform:"darwin",hostname:"test-host",uptimeSec:123456,sampledAt:"2026-06-23T12:00:00.000Z"},J={title:"Widgets/SystemMonitorWidget",component:E,decorators:[e=>t.jsx("div",{className:"h-64 w-80",children:t.jsx(e,{})})]},n={beforeEach:()=>A([{match:"/system/stats",json:L}]),play:async({canvasElement:e})=>{const a=j(e);await r(await a.findByText("System monitor")).toBeInTheDocument(),r(await a.findAllByText(/CPU/)).not.toHaveLength(0),r(a.getAllByText(/RAM/)).not.toHaveLength(0),r(e.querySelector("svg")).toBeTruthy()}},o={beforeEach:()=>A([{match:"/system/stats",status:503}]),play:async({canvasElement:e})=>{const a=j(e);await r(await a.findByText(/unavailable/i)).toBeInTheDocument()}};n.parameters={...n.parameters,docs:{...(h=n.parameters)===null||h===void 0?void 0:h.docs,source:{originalSource:`{
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
}`,...(v=n.parameters)===null||v===void 0||(y=v.docs)===null||y===void 0?void 0:y.source},description:{story:"Renders the real CPU/RAM monitor with its legend and area chart.",...(x=n.parameters)===null||x===void 0||(f=x.docs)===null||f===void 0?void 0:f.description}}};o.parameters={...o.parameters,docs:{...(g=o.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
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
}`,...(w=o.parameters)===null||w===void 0||(_=w.docs)===null||_===void 0?void 0:_.source},description:{story:'Gateway unreachable → the "unavailable" message rather than a fake chart.',...(S=o.parameters)===null||S===void 0||(M=S.docs)===null||M===void 0?void 0:M.description}}};const Q=["Default","Unavailable"];export{n as Default,o as Unavailable,Q as __namedExportsOrder,J as default};
