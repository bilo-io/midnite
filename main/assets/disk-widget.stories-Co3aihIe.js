import{aL as T,aX as t}from"./iframe-M5pB75MI.js";import{i as x}from"./mock-fetch-aFrr3kfG.js";import{p as D}from"./index-CygiHf26.js";import{u as b}from"./use-system-stats-BkA7vwo8.js";import{W as k}from"./spinner-9hpyhM-C.js";import{W as j}from"./widget-card-C95_ujy1.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-DytAAI0X.js";import"./chevron-down-BdPV_vZv.js";import"./check-Cac8-Y37.js";import"./useQuery-DecT-ojR.js";import"./api-COvOl9gx.js";/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const S=[["path",{d:"M10 16h.01",key:"1bzywj"}],["path",{d:"M2.212 11.577a2 2 0 0 0-.212.896V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5.527a2 2 0 0 0-.212-.896L18.55 5.11A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",key:"18tbho"}],["path",{d:"M21.946 12.013H2.054",key:"zqlbp7"}],["path",{d:"M6 16h.01",key:"1pmjb7"}]],E=T("hard-drive",S);function g(){const{stats:e,loading:a,error:B}=b();var c;const n=(c=e==null?void 0:e.disks[0])!==null&&c!==void 0?c:null;return t.jsx(j,{title:"Disk",icon:E,bodyClassName:"flex flex-col items-center justify-center gap-3 p-4",children:a?t.jsx(k,{}):B||!n?t.jsx("p",{className:"px-2 text-center text-sm text-muted-foreground",children:"Disk usage is unavailable."}):t.jsxs(t.Fragment,{children:[t.jsx(D,{usedBytes:n.usedBytes,totalBytes:n.totalBytes}),t.jsx("span",{className:"max-w-full truncate font-mono text-[11px] text-muted-foreground",title:n.path,children:n.path})]})})}g.__docgenInfo={description:"Real device storage: the capacity of the filesystem hosting the gateway,\npolled from `GET /system/stats` (`node:fs.statfs`). Unlike the App-cache widget\n— which shows the browser's per-origin quota — this is the actual hard drive.",methods:[],displayName:"DiskWidget"};var l,d,m,p,u,h,v,y,f,_;const{expect:r,within:w}=__STORYBOOK_MODULE_TEST__,s=1024**3,I={cpu:{usagePct:12,cores:8,loadAvg1:.5},memory:{totalBytes:16*s,usedBytes:8*s,freeBytes:8*s,usagePct:50},disks:[{path:"/",totalBytes:500*s,usedBytes:300*s,freeBytes:200*s,usagePct:60}],platform:"darwin",uptimeSec:42e3,sampledAt:"2026-06-23T12:00:00.000Z"},P={title:"Widgets/DiskWidget",component:g,decorators:[e=>t.jsx("div",{className:"h-80 w-72",children:t.jsx(e,{})})]},o={beforeEach:()=>x([{match:"/system/stats",json:I}]),play:async({canvasElement:e})=>{const a=w(e);await r(await a.findByText("Disk")).toBeInTheDocument(),await r(await a.findByText(/60% used/)).toBeInTheDocument(),await r(a.getByText("/")).toBeInTheDocument(),r(e.querySelectorAll("circle")).toHaveLength(2)}},i={beforeEach:()=>x([{match:"/system/stats",status:503}]),play:async({canvasElement:e})=>{const a=w(e);await r(await a.findByText(/unavailable/i)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(l=o.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
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
}`,...(m=o.parameters)===null||m===void 0||(d=m.docs)===null||d===void 0?void 0:d.source},description:{story:"300 GB of 500 GB used → 60%, with the mount path shown below.",...(u=o.parameters)===null||u===void 0||(p=u.docs)===null||p===void 0?void 0:p.description}}};i.parameters={...i.parameters,docs:{...(h=i.parameters)===null||h===void 0?void 0:h.docs,source:{originalSource:`{
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
}`,...(y=i.parameters)===null||y===void 0||(v=y.docs)===null||v===void 0?void 0:v.source},description:{story:'Gateway unreachable → the "unavailable" message.',...(_=i.parameters)===null||_===void 0||(f=_.docs)===null||f===void 0?void 0:f.description}}};const R=["Default","Unavailable"];export{o as Default,i as Unavailable,R as __namedExportsOrder,P as default};
