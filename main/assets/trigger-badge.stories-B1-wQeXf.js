import{n as e}from"./iframe-CQd7E9rJ.js";import{T as t}from"./trigger-badge-BIWyNfGo.js";import"./preload-helper-Dp1pzeXC.js";import"./webhook-_qrrdGdd.js";import"./clock-B1-bSjJ8.js";var l,d,n,i,p,m,c,u,g,_,v,h;const S={title:"Components/TriggerBadge",component:t},r={args:{type:"manual"}},a={args:{type:"schedule"}},o={args:{type:"webhook"}},s={args:{type:"manual"},render:()=>e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx(t,{type:"manual"}),e.jsx(t,{type:"schedule"}),e.jsx(t,{type:"webhook"})]})};r.parameters={...r.parameters,docs:{...(l=r.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
  args: {
    type: 'manual'
  }
}`,...(n=r.parameters)===null||n===void 0||(d=n.docs)===null||d===void 0?void 0:d.source}}};a.parameters={...a.parameters,docs:{...(i=a.parameters)===null||i===void 0?void 0:i.docs,source:{originalSource:`{
  args: {
    type: 'schedule'
  }
}`,...(m=a.parameters)===null||m===void 0||(p=m.docs)===null||p===void 0?void 0:p.source}}};o.parameters={...o.parameters,docs:{...(c=o.parameters)===null||c===void 0?void 0:c.docs,source:{originalSource:`{
  args: {
    type: 'webhook'
  }
}`,...(g=o.parameters)===null||g===void 0||(u=g.docs)===null||u===void 0?void 0:u.source}}};s.parameters={...s.parameters,docs:{...(_=s.parameters)===null||_===void 0?void 0:_.docs,source:{originalSource:`{
  args: {
    type: 'manual'
  },
  render: () => <div className="flex items-center gap-3">
      <TriggerBadge type="manual" />
      <TriggerBadge type="schedule" />
      <TriggerBadge type="webhook" />
    </div>
}`,...(h=s.parameters)===null||h===void 0||(v=h.docs)===null||v===void 0?void 0:v.source}}};const f=["Manual","Schedule","Webhook","AllTriggers"];export{s as AllTriggers,r as Manual,a as Schedule,o as Webhook,f as __namedExportsOrder,S as default};
