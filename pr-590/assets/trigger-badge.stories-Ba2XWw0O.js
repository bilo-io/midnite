import{a_ as e}from"./iframe-CrpS2k1s.js";import{T as t}from"./trigger-badge-BpblvUUM.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DvODZydW.js";import"./webhook-BoFPfw12.js";import"./clock-CHy2o9t5.js";var n,i,l,p,d,m,c,g,u,v,_,k;const f={title:"Components/TriggerBadge",component:t},r={args:{type:"manual"}},a={args:{type:"webhook"}},s={args:{type:"task-event"}},o={args:{type:"manual"},render:()=>e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx(t,{type:"manual"}),e.jsx(t,{type:"webhook"}),e.jsx(t,{type:"task-event"})]})};r.parameters={...r.parameters,docs:{...(n=r.parameters)===null||n===void 0?void 0:n.docs,source:{originalSource:`{
  args: {
    type: 'manual'
  }
}`,...(l=r.parameters)===null||l===void 0||(i=l.docs)===null||i===void 0?void 0:i.source}}};a.parameters={...a.parameters,docs:{...(p=a.parameters)===null||p===void 0?void 0:p.docs,source:{originalSource:`{
  args: {
    type: 'webhook'
  }
}`,...(m=a.parameters)===null||m===void 0||(d=m.docs)===null||d===void 0?void 0:d.source}}};s.parameters={...s.parameters,docs:{...(c=s.parameters)===null||c===void 0?void 0:c.docs,source:{originalSource:`{
  args: {
    type: 'task-event'
  }
}`,...(u=s.parameters)===null||u===void 0||(g=u.docs)===null||g===void 0?void 0:g.source}}};o.parameters={...o.parameters,docs:{...(v=o.parameters)===null||v===void 0?void 0:v.docs,source:{originalSource:`{
  args: {
    type: 'manual'
  },
  render: () => <div className="flex items-center gap-3">
      <TriggerBadge type="manual" />
      <TriggerBadge type="webhook" />
      <TriggerBadge type="task-event" />
    </div>
}`,...(k=o.parameters)===null||k===void 0||(_=k.docs)===null||_===void 0?void 0:_.source}}};const j=["Manual","Webhook","TaskEvent","AllTriggers"];export{o as AllTriggers,r as Manual,s as TaskEvent,a as Webhook,j as __namedExportsOrder,f as default};
