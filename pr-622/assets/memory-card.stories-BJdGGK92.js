import{b3 as R,b0 as e,aN as O}from"./iframe-CRXPy4mK.js";import{p as M,a as D,b as B,c as H}from"./fixtures-BZzR_DAR.js";import{M as E}from"./memory-scope-BLfGyZHe.js";import{S as L}from"./selectable-icon-Dtu3m7L0.js";import{u as F}from"./use-locale-format-C1g7Psdh.js";import{B as U}from"./brain-circuit-0iWCXQqm.js";import"./preload-helper-Dp1pzeXC.js";import"./project-tag-BZipbSgb.js";import"./index-DCHV2XZ2.js";import"./Select-ef7c0426.esm-CAHlbNH0.js";import"./chevron-down-CZEjkYQ1.js";import"./check-CJ1US0TT.js";import"./brain-BOtLSn3A.js";function q({memory:r,project:i,layout:d,onOpen:A,selected:c=!1,onToggleSelect:n}){const I=R("memory"),{dateTime:K}=F(),G=(()=>{const t=new Date(r.updatedAt);return Number.isNaN(t.getTime())?"":K(t)})();var l;const m=(l=r.content.split(`
`).map(t=>t.trim()).find(t=>t&&!t.startsWith("#")))!==null&&l!==void 0?l:"",P=e.jsx(L,{Icon:U,selected:c,onToggle:t=>n==null?void 0:n(t)}),C=r.archived?e.jsx("span",{className:"rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground",children:I("list.card.archived")}):null;return d==="list"?e.jsxs("div",{className:O("group flex items-center gap-3 rounded-lg border border-border/60 surface-glass-interactive p-3 transition-colors hover:border-foreground/20",c&&"border-primary/50 bg-accent/30",r.archived&&"opacity-80"),children:[P,e.jsxs("button",{type:"button",onClick:A,className:"min-w-0 flex-1 text-left",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(E,{project:i}),C,e.jsx("span",{className:"truncate text-sm font-medium",children:r.title})]}),m?e.jsx("p",{className:"mt-0.5 truncate text-xs text-muted-foreground",children:m}):null]}),e.jsx("span",{className:"shrink-0 text-[11px] tabular-nums text-muted-foreground",children:G})]}):e.jsxs("div",{className:O("group flex flex-col gap-3 rounded-xl border border-border/60 surface-glass-interactive p-4 transition-colors hover:border-foreground/20",c&&"border-primary/50 bg-accent/30",r.archived&&"opacity-80"),children:[e.jsxs("div",{className:"flex items-center justify-between gap-2",children:[e.jsxs("div",{className:"flex min-w-0 items-center gap-2",children:[P,e.jsx(E,{project:i}),C]}),e.jsx("span",{className:"shrink-0 text-[11px] tabular-nums text-muted-foreground",children:G})]}),e.jsxs("button",{type:"button",onClick:A,className:"flex flex-col gap-3 text-left",children:[e.jsx("span",{className:"line-clamp-1 text-sm font-medium leading-snug",children:r.title}),e.jsx("p",{className:"line-clamp-2 min-h-8 text-xs text-muted-foreground",children:m})]})]})}q.__docgenInfo={description:"",methods:[],displayName:"MemoryCard",props:{memory:{required:!0,tsType:{name:"Memory"},description:""},project:{required:!1,tsType:{name:"Project"},description:"Resolved project for project-scoped memories; undefined = global."},layout:{required:!0,tsType:{name:"union",raw:"'list' | 'grid'",elements:[{name:"literal",value:"'list'"},{name:"literal",value:"'grid'"}]},description:""},onOpen:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},selected:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},onToggleSelect:{required:!1,tsType:{name:"signature",type:"function",raw:"(shiftKey: boolean) => void",signature:{arguments:[{type:{name:"boolean"},name:"shiftKey"}],return:{name:"void"}}},description:""}}};var p,u,v,x,y,g,h,f,_,b,j,N,S,w,T;const{expect:V,fn:k,userEvent:W,within:Y}=__STORYBOOK_MODULE_TEST__,de={title:"Components/MemoryCard",component:q,args:{onOpen:k(),onToggleSelect:k()}},o={args:{memory:B,layout:"grid"},decorators:[r=>e.jsx("div",{className:"max-w-xs",children:e.jsx(r,{})})],play:async({args:r,canvasElement:i})=>{const d=Y(i);await W.click(d.getByText(B.title)),await V(r.onOpen).toHaveBeenCalledOnce()}},a={args:{memory:H,project:M,layout:"list"},decorators:[r=>e.jsx("div",{className:"max-w-2xl",children:e.jsx(r,{})})]},s={args:{memory:D,project:M,layout:"grid",selected:!0},decorators:[r=>e.jsx("div",{className:"max-w-xs",children:e.jsx(r,{})})]};o.parameters={...o.parameters,docs:{...(p=o.parameters)===null||p===void 0?void 0:p.docs,source:{originalSource:`{
  args: {
    memory: memoryGlobal,
    layout: 'grid'
  },
  decorators: [Story => <div className="max-w-xs">
        <Story />
      </div>],
  play: async ({
    args,
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText(memoryGlobal.title));
    await expect(args.onOpen).toHaveBeenCalledOnce();
  }
}`,...(v=o.parameters)===null||v===void 0||(u=v.docs)===null||u===void 0?void 0:u.source},description:{story:'Global memory (the violet "Global" scope chip) in the grid layout.',...(y=o.parameters)===null||y===void 0||(x=y.docs)===null||x===void 0?void 0:x.description}}};a.parameters={...a.parameters,docs:{...(g=a.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
  args: {
    memory: memoryProjectScoped,
    project,
    layout: 'list'
  },
  decorators: [Story => <div className="max-w-2xl">
        <Story />
      </div>]
}`,...(f=a.parameters)===null||f===void 0||(h=f.docs)===null||h===void 0?void 0:h.source},description:{story:"Project-scoped memory (shows the project tag) in the list layout.",...(b=a.parameters)===null||b===void 0||(_=b.docs)===null||_===void 0?void 0:_.description}}};s.parameters={...s.parameters,docs:{...(j=s.parameters)===null||j===void 0?void 0:j.docs,source:{originalSource:`{
  args: {
    memory: memoryArchived,
    project,
    layout: 'grid',
    selected: true
  },
  decorators: [Story => <div className="max-w-xs">
        <Story />
      </div>]
}`,...(S=s.parameters)===null||S===void 0||(N=S.docs)===null||N===void 0?void 0:N.source},description:{story:'Archived memory — dimmed, with the "Archived" badge.',...(T=s.parameters)===null||T===void 0||(w=T.docs)===null||w===void 0?void 0:w.description}}};const ce=["Global","ProjectScoped","Archived"];export{s as Archived,o as Global,a as ProjectScoped,ce as __namedExportsOrder,de as default};
