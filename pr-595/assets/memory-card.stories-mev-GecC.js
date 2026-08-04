import{a_ as e,aM as O}from"./iframe-CgkUxXSp.js";import{p as k,a as R,b as B,c as D}from"./fixtures-BZzR_DAR.js";import{M as E}from"./memory-scope-DUnKeXgH.js";import{S as H}from"./selectable-icon-B1IsBPpQ.js";import{u as L}from"./use-locale-format-DoBUvXcJ.js";import{n as F}from"./index-Ddc5NNOG.js";import{B as U}from"./brain-circuit-Cp0Whay2.js";import"./preload-helper-Dp1pzeXC.js";import"./project-tag-BAt6Dq-D.js";import"./index-CvRymjnP.js";import"./Select-ef7c0426.esm-Bj9LFYDk.js";import"./chevron-down-BmyIY-zi.js";import"./check-D8GZnS6Z.js";import"./brain-m_1-GsyA.js";function q({memory:r,project:i,layout:d,onOpen:A,selected:c=!1,onToggleSelect:n}){const I=F("memory"),{dateTime:K}=L(),G=(()=>{const t=new Date(r.updatedAt);return Number.isNaN(t.getTime())?"":K(t)})();var l;const m=(l=r.content.split(`
`).map(t=>t.trim()).find(t=>t&&!t.startsWith("#")))!==null&&l!==void 0?l:"",P=e.jsx(H,{Icon:U,selected:c,onToggle:t=>n==null?void 0:n(t)}),C=r.archived?e.jsx("span",{className:"rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground",children:I("list.card.archived")}):null;return d==="list"?e.jsxs("div",{className:O("group flex items-center gap-3 rounded-lg border border-border/60 surface-glass-interactive p-3 transition-colors hover:border-foreground/20",c&&"border-primary/50 bg-accent/30",r.archived&&"opacity-80"),children:[P,e.jsxs("button",{type:"button",onClick:A,className:"min-w-0 flex-1 text-left",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(E,{project:i}),C,e.jsx("span",{className:"truncate text-sm font-medium",children:r.title})]}),m?e.jsx("p",{className:"mt-0.5 truncate text-xs text-muted-foreground",children:m}):null]}),e.jsx("span",{className:"shrink-0 text-[11px] tabular-nums text-muted-foreground",children:G})]}):e.jsxs("div",{className:O("group flex flex-col gap-3 rounded-xl border border-border/60 surface-glass-interactive p-4 transition-colors hover:border-foreground/20",c&&"border-primary/50 bg-accent/30",r.archived&&"opacity-80"),children:[e.jsxs("div",{className:"flex items-center justify-between gap-2",children:[e.jsxs("div",{className:"flex min-w-0 items-center gap-2",children:[P,e.jsx(E,{project:i}),C]}),e.jsx("span",{className:"shrink-0 text-[11px] tabular-nums text-muted-foreground",children:G})]}),e.jsxs("button",{type:"button",onClick:A,className:"flex flex-col gap-3 text-left",children:[e.jsx("span",{className:"line-clamp-1 text-sm font-medium leading-snug",children:r.title}),e.jsx("p",{className:"line-clamp-2 min-h-8 text-xs text-muted-foreground",children:m})]})]})}q.__docgenInfo={description:"",methods:[],displayName:"MemoryCard",props:{memory:{required:!0,tsType:{name:"Memory"},description:""},project:{required:!1,tsType:{name:"Project"},description:"Resolved project for project-scoped memories; undefined = global."},layout:{required:!0,tsType:{name:"union",raw:"'list' | 'grid'",elements:[{name:"literal",value:"'list'"},{name:"literal",value:"'grid'"}]},description:""},onOpen:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},selected:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},onToggleSelect:{required:!1,tsType:{name:"signature",type:"function",raw:"(shiftKey: boolean) => void",signature:{arguments:[{type:{name:"boolean"},name:"shiftKey"}],return:{name:"void"}}},description:""}}};var p,u,v,x,y,g,h,f,_,j,b,N,S,w,T;const{expect:V,fn:M,userEvent:W,within:Y}=__STORYBOOK_MODULE_TEST__,ce={title:"Components/MemoryCard",component:q,args:{onOpen:M(),onToggleSelect:M()}},o={args:{memory:B,layout:"grid"},decorators:[r=>e.jsx("div",{className:"max-w-xs",children:e.jsx(r,{})})],play:async({args:r,canvasElement:i})=>{const d=Y(i);await W.click(d.getByText(B.title)),await V(r.onOpen).toHaveBeenCalledOnce()}},a={args:{memory:D,project:k,layout:"list"},decorators:[r=>e.jsx("div",{className:"max-w-2xl",children:e.jsx(r,{})})]},s={args:{memory:R,project:k,layout:"grid",selected:!0},decorators:[r=>e.jsx("div",{className:"max-w-xs",children:e.jsx(r,{})})]};o.parameters={...o.parameters,docs:{...(p=o.parameters)===null||p===void 0?void 0:p.docs,source:{originalSource:`{
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
}`,...(f=a.parameters)===null||f===void 0||(h=f.docs)===null||h===void 0?void 0:h.source},description:{story:"Project-scoped memory (shows the project tag) in the list layout.",...(j=a.parameters)===null||j===void 0||(_=j.docs)===null||_===void 0?void 0:_.description}}};s.parameters={...s.parameters,docs:{...(b=s.parameters)===null||b===void 0?void 0:b.docs,source:{originalSource:`{
  args: {
    memory: memoryArchived,
    project,
    layout: 'grid',
    selected: true
  },
  decorators: [Story => <div className="max-w-xs">
        <Story />
      </div>]
}`,...(S=s.parameters)===null||S===void 0||(N=S.docs)===null||N===void 0?void 0:N.source},description:{story:'Archived memory — dimmed, with the "Archived" badge.',...(T=s.parameters)===null||T===void 0||(w=T.docs)===null||w===void 0?void 0:w.description}}};const ne=["Global","ProjectScoped","Archived"];export{s as Archived,o as Global,a as ProjectScoped,ne as __namedExportsOrder,ce as default};
