import{n as o}from"./iframe-kXbbvWEw.js";import{C as w}from"./context-ring-Z6FpYzRk.js";import"./preload-helper-Dp1pzeXC.js";var i,n,d,l,m,p,c,_,v,u,g,x,h,f,k,L,M,H;const C={title:"Components/ContextRing",component:w},e={args:{tokens:42e3,limit:2e5}},r={args:{tokens:13e4,limit:2e5}},s={args:{tokens:184e3,limit:2e5}},a={args:{tokens:42e3,limit:2e5},render:()=>o.jsx("div",{className:"flex items-center gap-6",children:[12e3,42e3,104e3,13e4,168e3,184e3,2e5].map(t=>o.jsxs("div",{className:"flex flex-col items-center gap-1.5",children:[o.jsx(w,{tokens:t,limit:2e5}),o.jsxs("span",{className:"text-[10px] tabular-nums text-muted-foreground",children:[Math.round(t/2e5*100),"%"]})]},t))})};e.parameters={...e.parameters,docs:{...(i=e.parameters)===null||i===void 0?void 0:i.docs,source:{originalSource:`{
  args: {
    tokens: 42_000,
    limit: 200_000
  }
}`,...(d=e.parameters)===null||d===void 0||(n=d.docs)===null||n===void 0?void 0:n.source},description:{story:"Under 50% — green. Hover for the tooltip.",...(m=e.parameters)===null||m===void 0||(l=m.docs)===null||l===void 0?void 0:l.description}}};r.parameters={...r.parameters,docs:{...(p=r.parameters)===null||p===void 0?void 0:p.docs,source:{originalSource:`{
  args: {
    tokens: 130_000,
    limit: 200_000
  }
}`,...(_=r.parameters)===null||_===void 0||(c=_.docs)===null||c===void 0?void 0:c.source},description:{story:"50–80% — amber.",...(u=r.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.description}}};s.parameters={...s.parameters,docs:{...(g=s.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
  args: {
    tokens: 184_000,
    limit: 200_000
  }
}`,...(h=s.parameters)===null||h===void 0||(x=h.docs)===null||x===void 0?void 0:x.source},description:{story:"Over 80% — red.",...(k=s.parameters)===null||k===void 0||(f=k.docs)===null||f===void 0?void 0:f.description}}};a.parameters={...a.parameters,docs:{...(L=a.parameters)===null||L===void 0?void 0:L.docs,source:{originalSource:`{
  args: {
    tokens: 42_000,
    limit: 200_000
  },
  render: () => <div className="flex items-center gap-6">
      {[12_000, 42_000, 104_000, 130_000, 168_000, 184_000, 200_000].map(tokens => <div key={tokens} className="flex flex-col items-center gap-1.5">
          <ContextRing tokens={tokens} limit={200_000} />
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {Math.round(tokens / 200_000 * 100)}%
          </span>
        </div>)}
    </div>
}`,...(H=a.parameters)===null||H===void 0||(M=H.docs)===null||M===void 0?void 0:M.source}}};const y=["Low","Mid","High","AllLevels"];export{a as AllLevels,s as High,e as Low,r as Mid,y as __namedExportsOrder,C as default};
