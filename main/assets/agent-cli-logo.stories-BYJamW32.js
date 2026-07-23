import{A as E,aU as e,a as O}from"./iframe-B0rFGTko.js";import{A as S}from"./agent-cli-logo-Bh5S5Hdx.js";import"./preload-helper-Dp1pzeXC.js";var c,n,t,m,p,u,_,v,g,x,A,C,N,h,w,f,L,G;const y={title:"Components/AgentCliLogo",component:S,argTypes:{cli:{control:"select",options:[...E]}}},a={args:{cli:"claude",className:"h-8 w-8"}},s={args:{cli:"gemini",className:"h-8 w-8"}},r={args:{cli:"codex",className:"h-8 w-8"}},o={args:{cli:"aider",className:"h-8 w-8"}},l={args:{cli:"opencode",className:"h-8 w-8"}},d={args:{cli:"claude"},render:()=>e.jsx("div",{className:"flex items-end gap-6",children:E.map(i=>e.jsxs("div",{className:"flex flex-col items-center gap-2",children:[e.jsx(S,{cli:i,className:"h-8 w-8"}),e.jsx("span",{className:"text-xs text-muted-foreground",children:O[i]})]},i))})};a.parameters={...a.parameters,docs:{...(c=a.parameters)===null||c===void 0?void 0:c.docs,source:{originalSource:`{
  args: {
    cli: 'claude',
    className: 'h-8 w-8'
  }
}`,...(t=a.parameters)===null||t===void 0||(n=t.docs)===null||n===void 0?void 0:n.source}}};s.parameters={...s.parameters,docs:{...(m=s.parameters)===null||m===void 0?void 0:m.docs,source:{originalSource:`{
  args: {
    cli: 'gemini',
    className: 'h-8 w-8'
  }
}`,...(u=s.parameters)===null||u===void 0||(p=u.docs)===null||p===void 0?void 0:p.source}}};r.parameters={...r.parameters,docs:{...(_=r.parameters)===null||_===void 0?void 0:_.docs,source:{originalSource:`{
  args: {
    cli: 'codex',
    className: 'h-8 w-8'
  }
}`,...(g=r.parameters)===null||g===void 0||(v=g.docs)===null||v===void 0?void 0:v.source}}};o.parameters={...o.parameters,docs:{...(x=o.parameters)===null||x===void 0?void 0:x.docs,source:{originalSource:`{
  args: {
    cli: 'aider',
    className: 'h-8 w-8'
  }
}`,...(C=o.parameters)===null||C===void 0||(A=C.docs)===null||A===void 0?void 0:A.source}}};l.parameters={...l.parameters,docs:{...(N=l.parameters)===null||N===void 0?void 0:N.docs,source:{originalSource:`{
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
}`,...(G=d.parameters)===null||G===void 0||(L=G.docs)===null||L===void 0?void 0:L.source}}};const B=["Claude","Gemini","Codex","Aider","OpenCode","AllAgents"];export{o as Aider,d as AllAgents,a as Claude,r as Codex,s as Gemini,l as OpenCode,B as __namedExportsOrder,y as default};
