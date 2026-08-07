import{A as E,b1 as e,a as O}from"./iframe-BH5Vu7l0.js";import{A as S}from"./agent-cli-logo-jZZa0fMp.js";import"./preload-helper-Dp1pzeXC.js";var c,n,i,m,p,u,v,_,g,x,A,C,N,h,w,f,L,y;const G={title:"Components/AgentCliLogo",component:S,argTypes:{cli:{control:"select",options:[...E]}}},a={args:{cli:"claude",className:"h-8 w-8"}},s={args:{cli:"antigravity",className:"h-8 w-8"}},r={args:{cli:"codex",className:"h-8 w-8"}},o={args:{cli:"hermes",className:"h-8 w-8"}},l={args:{cli:"opencode",className:"h-8 w-8"}},t={args:{cli:"claude"},render:()=>e.jsx("div",{className:"flex items-end gap-6",children:E.map(d=>e.jsxs("div",{className:"flex flex-col items-center gap-2",children:[e.jsx(S,{cli:d,className:"h-8 w-8"}),e.jsx("span",{className:"text-xs text-muted-foreground",children:O[d]})]},d))})};a.parameters={...a.parameters,docs:{...(c=a.parameters)===null||c===void 0?void 0:c.docs,source:{originalSource:`{
  args: {
    cli: 'claude',
    className: 'h-8 w-8'
  }
}`,...(i=a.parameters)===null||i===void 0||(n=i.docs)===null||n===void 0?void 0:n.source}}};s.parameters={...s.parameters,docs:{...(m=s.parameters)===null||m===void 0?void 0:m.docs,source:{originalSource:`{
  args: {
    cli: 'antigravity',
    className: 'h-8 w-8'
  }
}`,...(u=s.parameters)===null||u===void 0||(p=u.docs)===null||p===void 0?void 0:p.source}}};r.parameters={...r.parameters,docs:{...(v=r.parameters)===null||v===void 0?void 0:v.docs,source:{originalSource:`{
  args: {
    cli: 'codex',
    className: 'h-8 w-8'
  }
}`,...(g=r.parameters)===null||g===void 0||(_=g.docs)===null||_===void 0?void 0:_.source}}};o.parameters={...o.parameters,docs:{...(x=o.parameters)===null||x===void 0?void 0:x.docs,source:{originalSource:`{
  args: {
    cli: 'hermes',
    className: 'h-8 w-8'
  }
}`,...(C=o.parameters)===null||C===void 0||(A=C.docs)===null||A===void 0?void 0:A.source}}};l.parameters={...l.parameters,docs:{...(N=l.parameters)===null||N===void 0?void 0:N.docs,source:{originalSource:`{
  args: {
    cli: 'opencode',
    className: 'h-8 w-8'
  }
}`,...(w=l.parameters)===null||w===void 0||(h=w.docs)===null||h===void 0?void 0:h.source}}};t.parameters={...t.parameters,docs:{...(f=t.parameters)===null||f===void 0?void 0:f.docs,source:{originalSource:`{
  args: {
    cli: 'claude'
  },
  render: () => <div className="flex items-end gap-6">
      {AGENT_CLIS.map(cli => <div key={cli} className="flex flex-col items-center gap-2">
          <AgentCliLogo cli={cli} className="h-8 w-8" />
          <span className="text-xs text-muted-foreground">{AGENT_CLI_LABEL[cli]}</span>
        </div>)}
    </div>
}`,...(y=t.parameters)===null||y===void 0||(L=y.docs)===null||L===void 0?void 0:L.source}}};const I=["Claude","Antigravity","Codex","Hermes","OpenCode","AllAgents"];export{t as AllAgents,s as Antigravity,a as Claude,r as Codex,o as Hermes,l as OpenCode,I as __namedExportsOrder,G as default};
