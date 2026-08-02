import{aG as D,aZ as e,aL as C}from"./iframe-DIRT-jPh.js";import{p as M,a as K,b as B,c as L}from"./fixtures-BZzR_DAR.js";import{M as E}from"./memory-scope-BZbsbhCp.js";import{S as R}from"./selectable-icon-D0VGhisG.js";import{e as F,n as H}from"./index-BnyK6tdm.js";import{B as U}from"./brain-circuit-Cy2qYnDc.js";import"./preload-helper-Dp1pzeXC.js";import"./project-tag-WPQdSRrV.js";import"./index-BDKKvLcu.js";import"./Select-ef7c0426.esm-CenWVZPI.js";import"./chevron-down-21KOUYAq.js";import"./check-DKs1mfb8.js";import"./brain-BiMPLGY6.js";function V(){const r=F(),s=D(),i=Intl.DateTimeFormat().resolvedOptions().timeZone;return{locale:s,number:(a,t)=>r.number(a,t),money:(a,t,n)=>r.number(a,{style:"currency",currency:t,...n}),dateTime:(a,t)=>r.dateTime(a,{timeZone:i,...t})}}function q({memory:r,project:s,layout:i,onOpen:a,selected:t=!1,onToggleSelect:n}){const I=H("memory"),{dateTime:Z}=V(),A=(()=>{const o=new Date(r.updatedAt);return Number.isNaN(o.getTime())?"":Z(o)})();var m;const p=(m=r.content.split(`
`).map(o=>o.trim()).find(o=>o&&!o.startsWith("#")))!==null&&m!==void 0?m:"",O=e.jsx(R,{Icon:U,selected:t,onToggle:o=>n==null?void 0:n(o)}),P=r.archived?e.jsx("span",{className:"rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground",children:I("list.card.archived")}):null;return i==="list"?e.jsxs("div",{className:C("group flex items-center gap-3 rounded-lg border border-border/60 surface-glass-interactive p-3 transition-colors hover:border-foreground/20",t&&"border-primary/50 bg-accent/30",r.archived&&"opacity-80"),children:[O,e.jsxs("button",{type:"button",onClick:a,className:"min-w-0 flex-1 text-left",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(E,{project:s}),P,e.jsx("span",{className:"truncate text-sm font-medium",children:r.title})]}),p?e.jsx("p",{className:"mt-0.5 truncate text-xs text-muted-foreground",children:p}):null]}),e.jsx("span",{className:"shrink-0 text-[11px] tabular-nums text-muted-foreground",children:A})]}):e.jsxs("div",{className:C("group flex flex-col gap-3 rounded-xl border border-border/60 surface-glass-interactive p-4 transition-colors hover:border-foreground/20",t&&"border-primary/50 bg-accent/30",r.archived&&"opacity-80"),children:[e.jsxs("div",{className:"flex items-center justify-between gap-2",children:[e.jsxs("div",{className:"flex min-w-0 items-center gap-2",children:[O,e.jsx(E,{project:s}),P]}),e.jsx("span",{className:"shrink-0 text-[11px] tabular-nums text-muted-foreground",children:A})]}),e.jsxs("button",{type:"button",onClick:a,className:"flex flex-col gap-3 text-left",children:[e.jsx("span",{className:"line-clamp-1 text-sm font-medium leading-snug",children:r.title}),e.jsx("p",{className:"line-clamp-2 min-h-8 text-xs text-muted-foreground",children:p})]})]})}q.__docgenInfo={description:"",methods:[],displayName:"MemoryCard",props:{memory:{required:!0,tsType:{name:"Memory"},description:""},project:{required:!1,tsType:{name:"Project"},description:"Resolved project for project-scoped memories; undefined = global."},layout:{required:!0,tsType:{name:"union",raw:"'list' | 'grid'",elements:[{name:"literal",value:"'list'"},{name:"literal",value:"'grid'"}]},description:""},onOpen:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},selected:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},onToggleSelect:{required:!1,tsType:{name:"signature",type:"function",raw:"(shiftKey: boolean) => void",signature:{arguments:[{type:{name:"boolean"},name:"shiftKey"}],return:{name:"void"}}},description:""}}};var u,v,x,y,g,f,h,_,b,j,N,S,w,T,G;const{expect:W,fn:k,userEvent:Y,within:z}=__STORYBOOK_MODULE_TEST__,de={title:"Components/MemoryCard",component:q,args:{onOpen:k(),onToggleSelect:k()}},c={args:{memory:B,layout:"grid"},decorators:[r=>e.jsx("div",{className:"max-w-xs",children:e.jsx(r,{})})],play:async({args:r,canvasElement:s})=>{const i=z(s);await Y.click(i.getByText(B.title)),await W(r.onOpen).toHaveBeenCalledOnce()}},d={args:{memory:L,project:M,layout:"list"},decorators:[r=>e.jsx("div",{className:"max-w-2xl",children:e.jsx(r,{})})]},l={args:{memory:K,project:M,layout:"grid",selected:!0},decorators:[r=>e.jsx("div",{className:"max-w-xs",children:e.jsx(r,{})})]};c.parameters={...c.parameters,docs:{...(u=c.parameters)===null||u===void 0?void 0:u.docs,source:{originalSource:`{
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
}`,...(x=c.parameters)===null||x===void 0||(v=x.docs)===null||v===void 0?void 0:v.source},description:{story:'Global memory (the violet "Global" scope chip) in the grid layout.',...(g=c.parameters)===null||g===void 0||(y=g.docs)===null||y===void 0?void 0:y.description}}};d.parameters={...d.parameters,docs:{...(f=d.parameters)===null||f===void 0?void 0:f.docs,source:{originalSource:`{
  args: {
    memory: memoryProjectScoped,
    project,
    layout: 'list'
  },
  decorators: [Story => <div className="max-w-2xl">
        <Story />
      </div>]
}`,...(_=d.parameters)===null||_===void 0||(h=_.docs)===null||h===void 0?void 0:h.source},description:{story:"Project-scoped memory (shows the project tag) in the list layout.",...(j=d.parameters)===null||j===void 0||(b=j.docs)===null||b===void 0?void 0:b.description}}};l.parameters={...l.parameters,docs:{...(N=l.parameters)===null||N===void 0?void 0:N.docs,source:{originalSource:`{
  args: {
    memory: memoryArchived,
    project,
    layout: 'grid',
    selected: true
  },
  decorators: [Story => <div className="max-w-xs">
        <Story />
      </div>]
}`,...(w=l.parameters)===null||w===void 0||(S=w.docs)===null||S===void 0?void 0:S.source},description:{story:'Archived memory — dimmed, with the "Archived" badge.',...(G=l.parameters)===null||G===void 0||(T=G.docs)===null||T===void 0?void 0:T.description}}};const le=["Global","ProjectScoped","Archived"];export{l as Archived,c as Global,d as ProjectScoped,le as __namedExportsOrder,de as default};
