import{l as e}from"./iframe-mYbb-MFG.js";import{W as u}from"./widget-card-BW4gWwVB.js";import{N as m}from"./newspaper-BpgSsK3D.js";import{R as h}from"./refresh-cw-FKXu5Q_m.js";import"./preload-helper-Dp1pzeXC.js";var s,a,o,i,n,d,c,l;const w={title:"Components/WidgetCard",component:u,decorators:[p=>e.jsx("div",{className:"h-48 max-w-sm",children:e.jsx(p,{})})]},r={args:{title:"Latest news",icon:m,children:e.jsx("p",{className:"p-4 text-sm text-muted-foreground",children:"Three new headlines."})}},t={args:{title:"Latest news",icon:m,actions:e.jsx("button",{type:"button","aria-label":"Refresh",className:"text-muted-foreground hover:text-foreground",children:e.jsx(h,{className:"h-3.5 w-3.5"})}),children:e.jsx("p",{className:"p-4 text-sm text-muted-foreground",children:"Three new headlines."})}};r.parameters={...r.parameters,docs:{...(s=r.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
  args: {
    title: 'Latest news',
    icon: Newspaper,
    children: <p className="p-4 text-sm text-muted-foreground">Three new headlines.</p>
  }
}`,...(o=r.parameters)===null||o===void 0||(a=o.docs)===null||a===void 0?void 0:a.source}}};t.parameters={...t.parameters,docs:{...(i=t.parameters)===null||i===void 0?void 0:i.docs,source:{originalSource:`{
  args: {
    title: 'Latest news',
    icon: Newspaper,
    actions: <button type="button" aria-label="Refresh" className="text-muted-foreground hover:text-foreground">
        <RefreshCw className="h-3.5 w-3.5" />
      </button>,
    children: <p className="p-4 text-sm text-muted-foreground">Three new headlines.</p>
  }
}`,...(d=t.parameters)===null||d===void 0||(n=d.docs)===null||n===void 0?void 0:n.source},description:{story:"A widget with a header action (e.g. a refresh button).",...(l=t.parameters)===null||l===void 0||(c=l.docs)===null||c===void 0?void 0:c.description}}};const N=["Default","WithActions"];export{r as Default,t as WithActions,N as __namedExportsOrder,w as default};
