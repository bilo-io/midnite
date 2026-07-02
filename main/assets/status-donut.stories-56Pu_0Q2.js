import{S as P,s as f}from"./status-donut-CFqRxRwN.js";import"./iframe-BmmrWt6z.js";import"./preload-helper-Dp1pzeXC.js";import"./task-columns-DXf2yYcn.js";var r,s,n,d,p,u,i,l,c,m,_,v,g,S;function y(L){return f(new Map(L))}const E=y([["backlog",3],["todo",5],["wip",2],["waiting",1],["done",8]]),C={title:"Components/StatusDonut",component:P},t={args:{counts:E,total:19}},o={args:{counts:y([]),total:0}},a={args:{counts:y([["done",7]]),total:7}},e={args:{counts:E,total:19,size:160}};t.parameters={...t.parameters,docs:{...(r=t.parameters)===null||r===void 0?void 0:r.docs,source:{originalSource:`{
  args: {
    counts: populated,
    total: 19
  }
}`,...(n=t.parameters)===null||n===void 0||(s=n.docs)===null||s===void 0?void 0:s.source}}};o.parameters={...o.parameters,docs:{...(d=o.parameters)===null||d===void 0?void 0:d.docs,source:{originalSource:`{
  args: {
    counts: counts([]),
    total: 0
  }
}`,...(u=o.parameters)===null||u===void 0||(p=u.docs)===null||p===void 0?void 0:p.source},description:{story:"Zero tasks renders an even muted ring so the card still reads as a project.",...(l=o.parameters)===null||l===void 0||(i=l.docs)===null||i===void 0?void 0:i.description}}};a.parameters={...a.parameters,docs:{...(c=a.parameters)===null||c===void 0?void 0:c.docs,source:{originalSource:`{
  args: {
    counts: counts([['done', 7]]),
    total: 7
  }
}`,...(_=a.parameters)===null||_===void 0||(m=_.docs)===null||m===void 0?void 0:m.source}}};e.parameters={...e.parameters,docs:{...(v=e.parameters)===null||v===void 0?void 0:v.docs,source:{originalSource:`{
  args: {
    counts: populated,
    total: 19,
    size: 160
  }
}`,...(S=e.parameters)===null||S===void 0||(g=S.docs)===null||g===void 0?void 0:g.source}}};const D=["Populated","Empty","SingleStatus","Large"];export{o as Empty,e as Large,t as Populated,a as SingleStatus,D as __namedExportsOrder,C as default};
