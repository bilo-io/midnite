import{aN as k,aZ as a}from"./iframe-DIRT-jPh.js";import{i as x}from"./mock-fetch-aFrr3kfG.js";import{z as j}from"./index-BDKKvLcu.js";import{u as S}from"./use-system-stats-Dk-4ntHO.js";import{W as E}from"./spinner-Bk8jEVRT.js";import{W as U}from"./widget-card-CnbBD0s4.js";import{n as I}from"./index-BnyK6tdm.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-CenWVZPI.js";import"./chevron-down-21KOUYAq.js";import"./check-DKs1mfb8.js";import"./useQuery-CGGfYBmA.js";import"./api-BirC5KZo.js";/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A=[["path",{d:"M10 16h.01",key:"1bzywj"}],["path",{d:"M2.212 11.577a2 2 0 0 0-.212.896V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5.527a2 2 0 0 0-.212-.896L18.55 5.11A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",key:"18tbho"}],["path",{d:"M21.946 12.013H2.054",key:"zqlbp7"}],["path",{d:"M6 16h.01",key:"1pmjb7"}]],M=k("hard-drive",A);function w(){const e=I("common"),{stats:t,loading:T,error:b}=S();var l;const n=(l=t==null?void 0:t.disks[0])!==null&&l!==void 0?l:null,D={aria:s=>e("ui.gauge.pctUsed",{pct:s}),used:s=>e("ui.gauge.pctUsed",{pct:s}),of:s=>e("ui.gauge.ofTotal",{total:s}),free:s=>e("ui.gauge.free",{free:s})};return a.jsx(U,{title:"Disk",icon:M,bodyClassName:"flex flex-col items-center justify-center gap-3 p-4",children:T?a.jsx(E,{}):b||!n?a.jsx("p",{className:"px-2 text-center text-sm text-muted-foreground",children:"Disk usage is unavailable."}):a.jsxs(a.Fragment,{children:[a.jsx(j,{usedBytes:n.usedBytes,totalBytes:n.totalBytes,labels:D}),a.jsx("span",{className:"max-w-full truncate font-mono text-[11px] text-muted-foreground",title:n.path,children:n.path})]})})}w.__docgenInfo={description:"Real device storage: the capacity of the filesystem hosting the gateway,\npolled from `GET /system/stats` (`node:fs.statfs`). Unlike the App-cache widget\n— which shows the browser's per-origin quota — this is the actual hard drive.",methods:[],displayName:"DiskWidget"};var d,m,u,p,h,v,y,f,g,_;const{expect:c,within:B}=__STORYBOOK_MODULE_TEST__,o=1024**3,W={cpu:{usagePct:12,cores:8,loadAvg1:.5},memory:{totalBytes:16*o,usedBytes:8*o,freeBytes:8*o,usagePct:50},disks:[{path:"/",totalBytes:500*o,usedBytes:300*o,freeBytes:200*o,usagePct:60}],platform:"darwin",uptimeSec:42e3,sampledAt:"2026-06-23T12:00:00.000Z"},K={title:"Widgets/DiskWidget",component:w,decorators:[e=>a.jsx("div",{className:"h-80 w-72",children:a.jsx(e,{})})]},i={beforeEach:()=>x([{match:"/system/stats",json:W}]),play:async({canvasElement:e})=>{const t=B(e);await c(await t.findByText("Disk")).toBeInTheDocument(),await c(await t.findByText(/60% used/)).toBeInTheDocument(),await c(t.getByText("/")).toBeInTheDocument(),c(e.querySelectorAll("circle")).toHaveLength(2)}},r={beforeEach:()=>x([{match:"/system/stats",status:503}]),play:async({canvasElement:e})=>{const t=B(e);await c(await t.findByText(/unavailable/i)).toBeInTheDocument()}};i.parameters={...i.parameters,docs:{...(d=i.parameters)===null||d===void 0?void 0:d.docs,source:{originalSource:`{
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
}`,...(u=i.parameters)===null||u===void 0||(m=u.docs)===null||m===void 0?void 0:m.source},description:{story:"300 GB of 500 GB used → 60%, with the mount path shown below.",...(h=i.parameters)===null||h===void 0||(p=h.docs)===null||p===void 0?void 0:p.description}}};r.parameters={...r.parameters,docs:{...(v=r.parameters)===null||v===void 0?void 0:v.docs,source:{originalSource:`{
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
}`,...(f=r.parameters)===null||f===void 0||(y=f.docs)===null||y===void 0?void 0:y.source},description:{story:'Gateway unreachable → the "unavailable" message.',...(_=r.parameters)===null||_===void 0||(g=_.docs)===null||g===void 0?void 0:g.description}}};const Y=["Default","Unavailable"];export{i as Default,r as Unavailable,Y as __namedExportsOrder,K as default};
