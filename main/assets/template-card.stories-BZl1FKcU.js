import{n as e}from"./iframe-DaFpXuLo.js";import{T as t}from"./templates-B6M1OYb3.js";import{P as h}from"./project-tag-Bq9dRGyd.js";import{F as y}from"./file-text-CB-qH1qb.js";import"./preload-helper-Dp1pzeXC.js";import"./webhook-Ddo3p-Ag.js";function T({template:r,layout:b,onOpen:f}){return b==="list"?e.jsxs("button",{type:"button",onClick:f,className:"group flex w-full items-center gap-3 rounded-lg border border-border/60 bg-card/40 p-3 text-left transition-colors hover:border-foreground/20 hover:bg-accent/40",children:[e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(h,{tag:r.tag,color:r.color}),e.jsx("span",{className:"truncate text-sm font-medium",children:r.name})]}),e.jsx("p",{className:"mt-0.5 truncate text-xs text-muted-foreground",children:r.description})]}),e.jsx(y,{className:"h-4 w-4 shrink-0 text-muted-foreground"})]}):e.jsxs("button",{type:"button",onClick:f,className:"group flex flex-col gap-3 rounded-xl border border-border/60 bg-card/40 p-4 text-left transition-colors hover:border-foreground/20 hover:bg-accent/40",children:[e.jsxs("div",{className:"flex items-center justify-between gap-2",children:[e.jsx(h,{tag:r.tag,color:r.color}),e.jsx(y,{className:"h-4 w-4 shrink-0 text-muted-foreground"})]}),e.jsx("span",{className:"line-clamp-1 text-sm font-medium leading-snug",children:r.name}),e.jsx("p",{className:"line-clamp-2 text-xs text-muted-foreground",children:r.description})]})}T.__docgenInfo={description:"",methods:[],displayName:"TemplateCard",props:{template:{required:!0,tsType:{name:"Template"},description:""},layout:{required:!0,tsType:{name:"union",raw:"'list' | 'grid'",elements:[{name:"literal",value:"'list'"},{name:"literal",value:"'grid'"}]},description:""},onOpen:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};var i,d,l,n,m,c,p,u,g,x,v;const{fn:j}=__STORYBOOK_MODULE_TEST__,P={title:"Components/TemplateCard",component:T,args:{onOpen:j()}},s={args:{template:t[0],layout:"grid"},decorators:[r=>e.jsx("div",{className:"max-w-xs",children:e.jsx(r,{})})]};var _;const o={args:{template:(_=t[1])!==null&&_!==void 0?_:t[0],layout:"list"},decorators:[r=>e.jsx("div",{className:"max-w-2xl",children:e.jsx(r,{})})]},a={args:{template:t[0],layout:"grid"},render:()=>e.jsx("div",{className:"grid max-w-4xl grid-cols-3 gap-3",children:t.map(r=>e.jsx(T,{template:r,layout:"grid",onOpen:j()},r.id))})};s.parameters={...s.parameters,docs:{...(i=s.parameters)===null||i===void 0?void 0:i.docs,source:{originalSource:`{
  args: {
    template: TEMPLATES[0]!,
    layout: 'grid'
  },
  decorators: [Story => <div className="max-w-xs">
        <Story />
      </div>]
}`,...(l=s.parameters)===null||l===void 0||(d=l.docs)===null||d===void 0?void 0:d.source}}};o.parameters={...o.parameters,docs:{...(n=o.parameters)===null||n===void 0?void 0:n.docs,source:{originalSource:`{
  args: {
    template: TEMPLATES[1] ?? TEMPLATES[0]!,
    layout: 'list'
  },
  decorators: [Story => <div className="max-w-2xl">
        <Story />
      </div>]
}`,...(c=o.parameters)===null||c===void 0||(m=c.docs)===null||m===void 0?void 0:m.source}}};a.parameters={...a.parameters,docs:{...(p=a.parameters)===null||p===void 0?void 0:p.docs,source:{originalSource:`{
  args: {
    template: TEMPLATES[0]!,
    layout: 'grid'
  },
  render: () => <div className="grid max-w-4xl grid-cols-3 gap-3">
      {TEMPLATES.map(t => <TemplateCard key={t.id} template={t} layout="grid" onOpen={fn()} />)}
    </div>
}`,...(g=a.parameters)===null||g===void 0||(u=g.docs)===null||u===void 0?void 0:u.source},description:{story:"The whole built-in catalog, as the Templates tab lays it out.",...(v=a.parameters)===null||v===void 0||(x=v.docs)===null||x===void 0?void 0:x.description}}};const M=["Grid","List","Catalog"];export{a as Catalog,s as Grid,o as List,M as __namedExportsOrder,P as default};
