import{A as E,aW as e,a as O}from"./iframe-C6UFZr0b.js";import{A as S}from"./agent-cli-logo-DUKp9VjT.js";import"./preload-helper-Dp1pzeXC.js";var t,c,n,m,p,u,v,_,g,A,x,C,N,h,w,f,L,y;const I={title:"Components/AgentCliLogo",component:S,argTypes:{cli:{control:"select",options:[...E]}}},a={args:{cli:"claude",className:"h-8 w-8"}},s={args:{cli:"antigravity",className:"h-8 w-8"}},r={args:{cli:"codex",className:"h-8 w-8"}},o={args:{cli:"aider",className:"h-8 w-8"}},l={args:{cli:"opencode",className:"h-8 w-8"}},d={args:{cli:"claude"},render:()=>e.jsx("div",{className:"flex items-end gap-6",children:E.map(i=>e.jsxs("div",{className:"flex flex-col items-center gap-2",children:[e.jsx(S,{cli:i,className:"h-8 w-8"}),e.jsx("span",{className:"text-xs text-muted-foreground",children:O[i]})]},i))})};a.parameters={...a.parameters,docs:{...(t=a.parameters)===null||t===void 0?void 0:t.docs,source:{originalSource:`{
  args: {
    cli: 'claude',
    className: 'h-8 w-8'
  }
}`,...(n=a.parameters)===null||n===void 0||(c=n.docs)===null||c===void 0?void 0:c.source}}};s.parameters={...s.parameters,docs:{...(m=s.parameters)===null||m===void 0?void 0:m.docs,source:{originalSource:`{
  args: {
    cli: 'antigravity',
    className: 'h-8 w-8'
  }
}`,...(u=s.parameters)===null||u===void 0||(p=u.docs)===null||p===void 0?void 0:p.source}}};r.parameters={...r.parameters,docs:{...(v=r.parameters)===null||v===void 0?void 0:v.docs,source:{originalSource:`{
  args: {
    cli: 'codex',
    className: 'h-8 w-8'
  }
}`,...(g=r.parameters)===null||g===void 0||(_=g.docs)===null||_===void 0?void 0:_.source}}};o.parameters={...o.parameters,docs:{...(A=o.parameters)===null||A===void 0?void 0:A.docs,source:{originalSource:`{
  args: {
    cli: 'aider',
    className: 'h-8 w-8'
  }
}`,...(C=o.parameters)===null||C===void 0||(x=C.docs)===null||x===void 0?void 0:x.source}}};l.parameters={...l.parameters,docs:{...(N=l.parameters)===null||N===void 0?void 0:N.docs,source:{originalSource:`{
  args: {
    cli: 'opencode',
    className: 'h-8 w-8'
  }
}`,...(w=l.parameters)===null||w===void 0||(h=w.docs)===null||h===void 0?void 0:h.source}}};d.parameters={...d.parameters,docs:{...(f=d.parameters)===null||f===void 0?void 0:f.docs,source:{originalSource:`{
  args: {
    cli: 'claude'
  },
  render: () => <div className="flex items-end gap-6">
      {AGENT_CLIS.map(cli => <div key={cli} className="flex flex-col items-center gap-2">
          <AgentCliLogo cli={cli} className="h-8 w-8" />
          <span className="text-xs text-muted-foreground">{AGENT_CLI_LABEL[cli]}</span>
        </div>)}
    </div>
}`,...(y=d.parameters)===null||y===void 0||(L=y.docs)===null||L===void 0?void 0:L.source}}};const B=["Claude","Antigravity","Codex","Aider","OpenCode","AllAgents"];export{o as Aider,d as AllAgents,s as Antigravity,a as Claude,r as Codex,l as OpenCode,B as __namedExportsOrder,I as default};
