import{l as e,d as C}from"./iframe-mYbb-MFG.js";import{p as M,a as I,b as O,c as D}from"./fixtures-BZzR_DAR.js";import{M as B}from"./memory-scope-DXLsBIIB.js";import{S as K}from"./selectable-icon-DYuPmh8a.js";import{B as L}from"./brain-circuit-gUGS8jI-.js";import"./preload-helper-Dp1pzeXC.js";import"./project-tag-CJ1IDfyH.js";import"./site-links-CKmuqtlB.js";import"./index-QsD7yz9r.js";import"./index-D8ZLGl48.js";import"./Select-ef7c0426.esm-DFRwqb-J.js";import"./chevron-down-CkQ0GFy0.js";import"./check-BZo3CYeU.js";import"./brain-bGsAVueH.js";function E(r){const t=new Date(r);return Number.isNaN(t.getTime())?"":t.toLocaleDateString()}function q({memory:r,project:t,layout:d,onOpen:T,selected:c=!1,onToggleSelect:n}){var l;const m=(l=r.content.split(`
`).map(o=>o.trim()).find(o=>o&&!o.startsWith("#")))!==null&&l!==void 0?l:"",G=e.jsx(K,{Icon:L,selected:c,onToggle:o=>n==null?void 0:n(o)}),P=r.archived?e.jsx("span",{className:"rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground",children:"Archived"}):null;return d==="list"?e.jsxs("div",{className:C("group flex items-center gap-3 rounded-lg border border-border/60 surface-glass-interactive p-3 transition-colors hover:border-foreground/20",c&&"border-primary/50 bg-accent/30",r.archived&&"opacity-80"),children:[G,e.jsxs("button",{type:"button",onClick:T,className:"min-w-0 flex-1 text-left",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(B,{project:t}),P,e.jsx("span",{className:"truncate text-sm font-medium",children:r.title})]}),m?e.jsx("p",{className:"mt-0.5 truncate text-xs text-muted-foreground",children:m}):null]}),e.jsx("span",{className:"shrink-0 text-[11px] tabular-nums text-muted-foreground",children:E(r.updatedAt)})]}):e.jsxs("div",{className:C("group flex flex-col gap-3 rounded-xl border border-border/60 surface-glass-interactive p-4 transition-colors hover:border-foreground/20",c&&"border-primary/50 bg-accent/30",r.archived&&"opacity-80"),children:[e.jsxs("div",{className:"flex items-center justify-between gap-2",children:[e.jsxs("div",{className:"flex min-w-0 items-center gap-2",children:[G,e.jsx(B,{project:t}),P]}),e.jsx("span",{className:"shrink-0 text-[11px] tabular-nums text-muted-foreground",children:E(r.updatedAt)})]}),e.jsxs("button",{type:"button",onClick:T,className:"flex flex-col gap-3 text-left",children:[e.jsx("span",{className:"line-clamp-1 text-sm font-medium leading-snug",children:r.title}),e.jsx("p",{className:"line-clamp-2 min-h-8 text-xs text-muted-foreground",children:m})]})]})}q.__docgenInfo={description:"",methods:[],displayName:"MemoryCard",props:{memory:{required:!0,tsType:{name:"Memory"},description:""},project:{required:!1,tsType:{name:"Project"},description:"Resolved project for project-scoped memories; undefined = global."},layout:{required:!0,tsType:{name:"union",raw:"'list' | 'grid'",elements:[{name:"literal",value:"'list'"},{name:"literal",value:"'grid'"}]},description:""},onOpen:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},selected:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},onToggleSelect:{required:!1,tsType:{name:"signature",type:"function",raw:"(shiftKey: boolean) => void",signature:{arguments:[{type:{name:"boolean"},name:"shiftKey"}],return:{name:"void"}}},description:""}}};var p,u,v,x,g,y,h,f,_,j,b,N,S,w,A;const{expect:R,fn:k,userEvent:H,within:U}=__STORYBOOK_MODULE_TEST__,ae={title:"Components/MemoryCard",component:q,args:{onOpen:k(),onToggleSelect:k()}},a={args:{memory:O,layout:"grid"},decorators:[r=>e.jsx("div",{className:"max-w-xs",children:e.jsx(r,{})})],play:async({args:r,canvasElement:t})=>{const d=U(t);await H.click(d.getByText(O.title)),await R(r.onOpen).toHaveBeenCalledOnce()}},s={args:{memory:D,project:M,layout:"list"},decorators:[r=>e.jsx("div",{className:"max-w-2xl",children:e.jsx(r,{})})]},i={args:{memory:I,project:M,layout:"grid",selected:!0},decorators:[r=>e.jsx("div",{className:"max-w-xs",children:e.jsx(r,{})})]};a.parameters={...a.parameters,docs:{...(p=a.parameters)===null||p===void 0?void 0:p.docs,source:{originalSource:`{
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
}`,...(v=a.parameters)===null||v===void 0||(u=v.docs)===null||u===void 0?void 0:u.source},description:{story:'Global memory (the violet "Global" scope chip) in the grid layout.',...(g=a.parameters)===null||g===void 0||(x=g.docs)===null||x===void 0?void 0:x.description}}};s.parameters={...s.parameters,docs:{...(y=s.parameters)===null||y===void 0?void 0:y.docs,source:{originalSource:`{
  args: {
    memory: memoryProjectScoped,
    project,
    layout: 'list'
  },
  decorators: [Story => <div className="max-w-2xl">
        <Story />
      </div>]
}`,...(f=s.parameters)===null||f===void 0||(h=f.docs)===null||h===void 0?void 0:h.source},description:{story:"Project-scoped memory (shows the project tag) in the list layout.",...(j=s.parameters)===null||j===void 0||(_=j.docs)===null||_===void 0?void 0:_.description}}};i.parameters={...i.parameters,docs:{...(b=i.parameters)===null||b===void 0?void 0:b.docs,source:{originalSource:`{
  args: {
    memory: memoryArchived,
    project,
    layout: 'grid',
    selected: true
  },
  decorators: [Story => <div className="max-w-xs">
        <Story />
      </div>]
}`,...(S=i.parameters)===null||S===void 0||(N=S.docs)===null||N===void 0?void 0:N.source},description:{story:'Archived memory — dimmed, with the "Archived" badge.',...(A=i.parameters)===null||A===void 0||(w=A.docs)===null||w===void 0?void 0:w.description}}};const se=["Global","ProjectScoped","Archived"];export{i as Archived,a as Global,s as ProjectScoped,se as __namedExportsOrder,ae as default};
