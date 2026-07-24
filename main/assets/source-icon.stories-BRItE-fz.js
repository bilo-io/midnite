import{ab as w,aU as s}from"./iframe-C8Cqg7xG.js";import{S as f}from"./source-icon-CdIuqje6.js";import"./preload-helper-Dp1pzeXC.js";import"./globe-BsHU3Vb7.js";import"./file-text-BjwNU6hr.js";import"./sticky-note-Bxy6yBzp.js";var n,t,c,l,m,p,u,g,_,v,k,h,x,N,G,S,b;const F={title:"Components/SourceIcon",component:f,argTypes:{kind:{control:"select",options:[...w]}}},a={args:{kind:"github",className:"h-6 w-6"}},r={args:{kind:"figma",className:"h-6 w-6"}},o={args:{kind:"google-docs",className:"h-6 w-6"}},i={args:{kind:"link",className:"h-6 w-6"}},e={args:{kind:"github"},render:()=>s.jsx("div",{className:"grid grid-cols-5 gap-x-6 gap-y-4",children:w.map(d=>s.jsxs("div",{className:"flex items-center gap-2",children:[s.jsx(f,{kind:d,className:"h-5 w-5"}),s.jsx("span",{className:"text-xs text-muted-foreground",children:d})]},d))})};a.parameters={...a.parameters,docs:{...(n=a.parameters)===null||n===void 0?void 0:n.docs,source:{originalSource:`{
  args: {
    kind: 'github',
    className: 'h-6 w-6'
  }
}`,...(c=a.parameters)===null||c===void 0||(t=c.docs)===null||t===void 0?void 0:t.source}}};r.parameters={...r.parameters,docs:{...(l=r.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
  args: {
    kind: 'figma',
    className: 'h-6 w-6'
  }
}`,...(p=r.parameters)===null||p===void 0||(m=p.docs)===null||m===void 0?void 0:m.source}}};o.parameters={...o.parameters,docs:{...(u=o.parameters)===null||u===void 0?void 0:u.docs,source:{originalSource:`{
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
}`,...(G=e.parameters)===null||G===void 0||(N=G.docs)===null||N===void 0?void 0:N.source},description:{story:"Every detected provider kind with its brand mark or lucide fallback.",...(b=e.parameters)===null||b===void 0||(S=b.docs)===null||S===void 0?void 0:S.description}}};const I=["Github","Figma","GoogleDocs","GenericLink","AllKinds"];export{e as AllKinds,r as Figma,i as GenericLink,a as Github,o as GoogleDocs,I as __namedExportsOrder,F as default};
