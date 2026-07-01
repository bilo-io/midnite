import{n as e,f as B}from"./iframe-CJ1m4Ybm.js";import{p as q,a as I,b as C,c as D}from"./fixtures-CckvYj1j.js";import{P as K}from"./project-tag-DoLGdFsr.js";import{S as L}from"./selectable-icon-C9hctgF5.js";import{B as R}from"./brain-circuit-BMw089Pv.js";import{B as H}from"./brain-n0eLqmDm.js";import"./preload-helper-Dp1pzeXC.js";import"./inbound-CbJZzwyX.js";import"./check-Dp1RnyS0.js";function O({project:r}){return r?e.jsx(K,{tag:r.tag,color:r.color}):e.jsxs("span",{className:"inline-flex items-center gap-1 rounded bg-[hsl(262_83%_66%/0.15)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(262_83%_72%)]",children:[e.jsx(H,{className:"h-3 w-3"}),"Global"]})}function k(r){const t=new Date(r);return Number.isNaN(t.getTime())?"":t.toLocaleDateString()}function M({memory:r,project:t,layout:n,onOpen:T,selected:d=!1,onToggleSelect:c}){var l;const m=(l=r.content.split(`
`).map(a=>a.trim()).find(a=>a&&!a.startsWith("#")))!==null&&l!==void 0?l:"",G=e.jsx(L,{Icon:R,selected:d,onToggle:a=>c==null?void 0:c(a)}),P=r.archived?e.jsx("span",{className:"rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground",children:"Archived"}):null;return n==="list"?e.jsxs("div",{className:B("group flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 p-3 transition-colors hover:border-foreground/20 hover:bg-accent/40",d&&"border-primary/50 bg-accent/30",r.archived&&"opacity-80"),children:[G,e.jsxs("button",{type:"button",onClick:T,className:"min-w-0 flex-1 text-left",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(O,{project:t}),P,e.jsx("span",{className:"truncate text-sm font-medium",children:r.title})]}),m?e.jsx("p",{className:"mt-0.5 truncate text-xs text-muted-foreground",children:m}):null]}),e.jsx("span",{className:"shrink-0 text-[11px] tabular-nums text-muted-foreground",children:k(r.updatedAt)})]}):e.jsxs("div",{className:B("group flex flex-col gap-3 rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-foreground/20 hover:bg-accent/40",d&&"border-primary/50 bg-accent/30",r.archived&&"opacity-80"),children:[e.jsxs("div",{className:"flex items-center justify-between gap-2",children:[e.jsxs("div",{className:"flex min-w-0 items-center gap-2",children:[G,e.jsx(O,{project:t}),P]}),e.jsx("span",{className:"shrink-0 text-[11px] tabular-nums text-muted-foreground",children:k(r.updatedAt)})]}),e.jsxs("button",{type:"button",onClick:T,className:"flex flex-col gap-3 text-left",children:[e.jsx("span",{className:"line-clamp-1 text-sm font-medium leading-snug",children:r.title}),e.jsx("p",{className:"line-clamp-2 min-h-8 text-xs text-muted-foreground",children:m})]})]})}M.__docgenInfo={description:"",methods:[],displayName:"MemoryCard",props:{memory:{required:!0,tsType:{name:"Memory"},description:""},project:{required:!1,tsType:{name:"Project"},description:"Resolved project for project-scoped memories; undefined = global."},layout:{required:!0,tsType:{name:"union",raw:"'list' | 'grid'",elements:[{name:"literal",value:"'list'"},{name:"literal",value:"'grid'"}]},description:""},onOpen:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},selected:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},onToggleSelect:{required:!1,tsType:{name:"signature",type:"function",raw:"(shiftKey: boolean) => void",signature:{arguments:[{type:{name:"boolean"},name:"shiftKey"}],return:{name:"void"}}},description:""}}};var p,u,v,x,g,y,h,f,_,b,j,N,w,S,A;const{expect:U,fn:E,userEvent:V,within:W}=__STORYBOOK_MODULE_TEST__,re={title:"Components/MemoryCard",component:M,args:{onOpen:E(),onToggleSelect:E()}},o={args:{memory:C,layout:"grid"},decorators:[r=>e.jsx("div",{className:"max-w-xs",children:e.jsx(r,{})})],play:async({args:r,canvasElement:t})=>{const n=W(t);await V.click(n.getByText(C.title)),await U(r.onOpen).toHaveBeenCalledOnce()}},s={args:{memory:D,project:q,layout:"list"},decorators:[r=>e.jsx("div",{className:"max-w-2xl",children:e.jsx(r,{})})]},i={args:{memory:I,project:q,layout:"grid",selected:!0},decorators:[r=>e.jsx("div",{className:"max-w-xs",children:e.jsx(r,{})})]};o.parameters={...o.parameters,docs:{...(p=o.parameters)===null||p===void 0?void 0:p.docs,source:{originalSource:`{
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
}`,...(v=o.parameters)===null||v===void 0||(u=v.docs)===null||u===void 0?void 0:u.source},description:{story:'Global memory (the violet "Global" scope chip) in the grid layout.',...(g=o.parameters)===null||g===void 0||(x=g.docs)===null||x===void 0?void 0:x.description}}};s.parameters={...s.parameters,docs:{...(y=s.parameters)===null||y===void 0?void 0:y.docs,source:{originalSource:`{
  args: {
    memory: memoryProjectScoped,
    project,
    layout: 'list'
  },
  decorators: [Story => <div className="max-w-2xl">
        <Story />
      </div>]
}`,...(f=s.parameters)===null||f===void 0||(h=f.docs)===null||h===void 0?void 0:h.source},description:{story:"Project-scoped memory (shows the project tag) in the list layout.",...(b=s.parameters)===null||b===void 0||(_=b.docs)===null||_===void 0?void 0:_.description}}};i.parameters={...i.parameters,docs:{...(j=i.parameters)===null||j===void 0?void 0:j.docs,source:{originalSource:`{
  args: {
    memory: memoryArchived,
    project,
    layout: 'grid',
    selected: true
  },
  decorators: [Story => <div className="max-w-xs">
        <Story />
      </div>]
}`,...(w=i.parameters)===null||w===void 0||(N=w.docs)===null||N===void 0?void 0:N.source},description:{story:'Archived memory — dimmed, with the "Archived" badge.',...(A=i.parameters)===null||A===void 0||(S=A.docs)===null||S===void 0?void 0:S.description}}};const te=["Global","ProjectScoped","Archived"];export{i as Archived,o as Global,s as ProjectScoped,te as __namedExportsOrder,re as default};
