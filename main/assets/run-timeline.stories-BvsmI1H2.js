import{aX as I}from"./iframe-Jpjsk1jK.js";import{i as T}from"./mock-fetch-aFrr3kfG.js";import{R as _}from"./run-timeline-CNKXWSD4.js";import"./preload-helper-Dp1pzeXC.js";import"./api-89O6jT8Y.js";import"./use-polling-B2yc_v7k.js";import"./useQuery-BW9a3SUa.js";import"./generateCategoricalChart-C9sYecBo.js";import"./value-BTdN53H7.js";import"./BarChart-ba5sg5Zy.js";import"./CartesianGrid-IHRBRpp6.js";var d,m,u,l,p,v,h,y,w;const{expect:o,within:D}=__STORYBOOK_MODULE_TEST__,n=Date.now(),t=e=>6e4*e;function r(e){return{id:"r",taskId:"t1",startedAt:new Date(n).toISOString(),endedAt:null,durationMs:null,outcome:null,retryCount:0,repo:"web",...e}}const g={taskId:"t1",runs:[r({id:"r1",startedAt:new Date(n-t(30)).toISOString(),endedAt:new Date(n-t(28)).toISOString(),durationMs:t(2),outcome:"failed",retryCount:0}),r({id:"r2",startedAt:new Date(n-t(20)).toISOString(),endedAt:new Date(n-t(16)).toISOString(),durationMs:t(4),outcome:"abandoned",retryCount:1}),r({id:"r3",startedAt:new Date(n-t(10)).toISOString(),endedAt:new Date(n-t(7)).toISOString(),durationMs:t(3),outcome:"done",retryCount:2})]},x={taskId:"t1",runs:[r({id:"r1",startedAt:new Date(n-t(12)).toISOString(),endedAt:new Date(n-t(9)).toISOString(),durationMs:t(3),outcome:"failed",retryCount:0}),r({id:"r2",startedAt:new Date(n-t(4)).toISOString(),endedAt:null,durationMs:null,outcome:null,retryCount:1})]},B={taskId:"t1",runs:[]},W={title:"Widgets/RunTimeline",component:_,args:{taskId:"t1"},decorators:[e=>I.jsx("div",{className:"w-[32rem] rounded-xl border bg-card p-5",children:I.jsx(e,{})})]},s={beforeEach:()=>T([{match:"/metrics/runs",json:g}]),play:async({canvasElement:e})=>{const a=D(e);await o(await a.findByLabelText("Run timeline chart")).toBeInTheDocument(),await o(a.getByText("Done")).toBeInTheDocument(),await o(a.getByText("Failed")).toBeInTheDocument()}},i={beforeEach:()=>T([{match:"/metrics/runs",json:B}]),play:async({canvasElement:e})=>{const a=D(e);await o(await a.findByText("No agent runs recorded yet.")).toBeInTheDocument()}},c={beforeEach:()=>T([{match:"/metrics/runs",json:x}]),play:async({canvasElement:e})=>{const a=D(e);await o(await a.findByText("Running")).toBeInTheDocument(),await o(a.getByLabelText("Run timeline chart")).toBeInTheDocument()}};s.parameters={...s.parameters,docs:{...(d=s.parameters)===null||d===void 0?void 0:d.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/metrics/runs',
    json: DATA
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByLabelText('Run timeline chart')).toBeInTheDocument();
    await expect(canvas.getByText('Done')).toBeInTheDocument();
    await expect(canvas.getByText('Failed')).toBeInTheDocument();
  }
}`,...(u=s.parameters)===null||u===void 0||(m=u.docs)===null||m===void 0?void 0:m.source}}};i.parameters={...i.parameters,docs:{...(l=i.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/metrics/runs',
    json: EMPTY
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('No agent runs recorded yet.')).toBeInTheDocument();
  }
}`,...(v=i.parameters)===null||v===void 0||(p=v.docs)===null||p===void 0?void 0:p.source}}};c.parameters={...c.parameters,docs:{...(h=c.parameters)===null||h===void 0?void 0:h.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/metrics/runs',
    json: WITH_LIVE
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Running')).toBeInTheDocument();
    await expect(canvas.getByLabelText('Run timeline chart')).toBeInTheDocument();
  }
}`,...(w=c.parameters)===null||w===void 0||(y=w.docs)===null||y===void 0?void 0:y.source}}};const C=["Default","Empty","WithLiveRun"];export{s as Default,i as Empty,c as WithLiveRun,C as __namedExportsOrder,W as default};
