import{aX as e}from"./iframe-C1xKAh6G.js";import{T as t}from"./trigger-badge-COnHkPf3.js";import"./preload-helper-Dp1pzeXC.js";import"./webhook-DA5nDeMr.js";import"./clock-rjoBJLlC.js";var n,l,i,d,p,m,c,g,u,v,_,k;const E={title:"Components/TriggerBadge",component:t},r={args:{type:"manual"}},a={args:{type:"webhook"}},s={args:{type:"task-event"}},o={args:{type:"manual"},render:()=>e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx(t,{type:"manual"}),e.jsx(t,{type:"webhook"}),e.jsx(t,{type:"task-event"})]})};r.parameters={...r.parameters,docs:{...(n=r.parameters)===null||n===void 0?void 0:n.docs,source:{originalSource:`{
  args: {
    type: 'manual'
  }
}`,...(i=r.parameters)===null||i===void 0||(l=i.docs)===null||l===void 0?void 0:l.source}}};a.parameters={...a.parameters,docs:{...(d=a.parameters)===null||d===void 0?void 0:d.docs,source:{originalSource:`{
  args: {
    type: 'webhook'
  }
}`,...(m=a.parameters)===null||m===void 0||(p=m.docs)===null||p===void 0?void 0:p.source}}};s.parameters={...s.parameters,docs:{...(c=s.parameters)===null||c===void 0?void 0:c.docs,source:{originalSource:`{
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
}`,...(k=o.parameters)===null||k===void 0||(_=k.docs)===null||_===void 0?void 0:_.source}}};const f=["Manual","Webhook","TaskEvent","AllTriggers"];export{o as AllTriggers,r as Manual,s as TaskEvent,a as Webhook,f as __namedExportsOrder,E as default};
