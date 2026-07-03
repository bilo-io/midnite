import{n as s}from"./iframe-CyuGqAe9.js";import{x as f}from"./inbound-caimLB85.js";import{S as w}from"./source-icon-CjIqIx4j.js";import"./preload-helper-Dp1pzeXC.js";import"./globe-keD1o-8D.js";import"./sticky-note-CAwZ3pnW.js";var d,t,c,l,m,p,u,g,_,v,k,h,x,N,G,S,b;const F={title:"Components/SourceIcon",component:w,argTypes:{kind:{control:"select",options:[...f]}}},r={args:{kind:"github",className:"h-6 w-6"}},a={args:{kind:"figma",className:"h-6 w-6"}},o={args:{kind:"google-docs",className:"h-6 w-6"}},i={args:{kind:"link",className:"h-6 w-6"}},e={args:{kind:"github"},render:()=>s.jsx("div",{className:"grid grid-cols-5 gap-x-6 gap-y-4",children:f.map(n=>s.jsxs("div",{className:"flex items-center gap-2",children:[s.jsx(w,{kind:n,className:"h-5 w-5"}),s.jsx("span",{className:"text-xs text-muted-foreground",children:n})]},n))})};r.parameters={...r.parameters,docs:{...(d=r.parameters)===null||d===void 0?void 0:d.docs,source:{originalSource:`{
  args: {
    kind: 'github',
    className: 'h-6 w-6'
  }
}`,...(c=r.parameters)===null||c===void 0||(t=c.docs)===null||t===void 0?void 0:t.source}}};a.parameters={...a.parameters,docs:{...(l=a.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
  args: {
    kind: 'figma',
    className: 'h-6 w-6'
  }
}`,...(p=a.parameters)===null||p===void 0||(m=p.docs)===null||m===void 0?void 0:m.source}}};o.parameters={...o.parameters,docs:{...(u=o.parameters)===null||u===void 0?void 0:u.docs,source:{originalSource:`{
  args: {
    kind: 'google-docs',
    className: 'h-6 w-6'
  }
}`,...(_=o.parameters)===null||_===void 0||(g=_.docs)===null||g===void 0?void 0:g.source}}};i.parameters={...i.parameters,docs:{...(v=i.parameters)===null||v===void 0?void 0:v.docs,source:{originalSource:`{
  args: {
    kind: 'link',
    className: 'h-6 w-6'
  }
}`,...(h=i.parameters)===null||h===void 0||(k=h.docs)===null||k===void 0?void 0:k.source}}};e.parameters={...e.parameters,docs:{...(x=e.parameters)===null||x===void 0?void 0:x.docs,source:{originalSource:`{
  args: {
    kind: 'github'
  },
  render: () => <div className="grid grid-cols-5 gap-x-6 gap-y-4">
      {SOURCE_KINDS.map(kind => <div key={kind} className="flex items-center gap-2">
          <SourceIcon kind={kind} className="h-5 w-5" />
          <span className="text-xs text-muted-foreground">{kind}</span>
        </div>)}
    </div>
}`,...(G=e.parameters)===null||G===void 0||(N=G.docs)===null||N===void 0?void 0:N.source},description:{story:"Every detected provider kind with its brand mark or lucide fallback.",...(b=e.parameters)===null||b===void 0||(S=b.docs)===null||S===void 0?void 0:S.description}}};const I=["Github","Figma","GoogleDocs","GenericLink","AllKinds"];export{e as AllKinds,a as Figma,i as GenericLink,r as Github,o as GoogleDocs,I as __namedExportsOrder,F as default};
