import{n as e}from"./iframe-D56zeehm.js";import{S as O}from"./spinner-BO2Zjl05.js";import"./preload-helper-Dp1pzeXC.js";var n,l,d,m,c,p,v,u,_,b,g,h,x,f,j,S,N;const B={title:"Components/Spinner",component:O,argTypes:{variant:{control:"select",options:["orbit","breathe","jitter","tumble"]}}},r={args:{variant:"orbit"}},a={args:{variant:"breathe"}},t={args:{variant:"jitter"}},s={args:{variant:"tumble"}},i={args:{},render:()=>e.jsx("div",{className:"flex items-center gap-12",children:["orbit","breathe","jitter","tumble"].map(o=>e.jsxs("div",{className:"flex flex-col items-center gap-3",children:[e.jsx("div",{className:"flex h-16 w-16 items-center justify-center",children:e.jsx(O,{variant:o})}),e.jsx("span",{className:"text-xs text-muted-foreground",children:o})]},o))})};r.parameters={...r.parameters,docs:{...(n=r.parameters)===null||n===void 0?void 0:n.docs,source:{originalSource:`{
  args: {
    variant: 'orbit'
  }
}`,...(d=r.parameters)===null||d===void 0||(l=d.docs)===null||l===void 0?void 0:l.source},description:{story:"The rAF-driven three-dot animation that morphs through phases.",...(c=r.parameters)===null||c===void 0||(m=c.docs)===null||m===void 0?void 0:m.description}}};a.parameters={...a.parameters,docs:{...(p=a.parameters)===null||p===void 0?void 0:p.docs,source:{originalSource:`{
  args: {
    variant: 'breathe'
  }
}`,...(u=a.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.source}}};t.parameters={...t.parameters,docs:{...(_=t.parameters)===null||_===void 0?void 0:_.docs,source:{originalSource:`{
  args: {
    variant: 'jitter'
  }
}`,...(g=t.parameters)===null||g===void 0||(b=g.docs)===null||b===void 0?void 0:b.source}}};s.parameters={...s.parameters,docs:{...(h=s.parameters)===null||h===void 0?void 0:h.docs,source:{originalSource:`{
  args: {
    variant: 'tumble'
  }
}`,...(f=s.parameters)===null||f===void 0||(x=f.docs)===null||x===void 0?void 0:x.source}}};i.parameters={...i.parameters,docs:{...(j=i.parameters)===null||j===void 0?void 0:j.docs,source:{originalSource:`{
  args: {},
  render: () => <div className="flex items-center gap-12">
      {(['orbit', 'breathe', 'jitter', 'tumble'] as const).map(variant => <div key={variant} className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center">
            <Spinner variant={variant} />
          </div>
          <span className="text-xs text-muted-foreground">{variant}</span>
        </div>)}
    </div>
}`,...(N=i.parameters)===null||N===void 0||(S=N.docs)===null||S===void 0?void 0:S.source}}};const J=["Orbit","Breathe","Jitter","Tumble","AllVariants"];export{i as AllVariants,a as Breathe,t as Jitter,r as Orbit,s as Tumble,J as __namedExportsOrder,B as default};
