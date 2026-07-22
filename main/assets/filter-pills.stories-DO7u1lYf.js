import{bq as te,bo as se,br as re,b5 as n,aX as s,aJ as v,b4 as ae}from"./iframe-M5pB75MI.js";import{C as oe}from"./chevron-down-BdPV_vZv.js";import{C as I}from"./check-Cac8-Y37.js";import{C as ne}from"./task-columns-DXf2yYcn.js";import"./preload-helper-Dp1pzeXC.js";const h=r=>r.color?r.color:r.hue?`hsl(${r.hue})`:null;function J({options:r,paramKey:m="status",allLabel:F="All",hideAll:Q=!1,placeholder:f,countNoun:W="selected",className:X}){const V=te(),x=se(),b=re(),[l,w]=n.useState(!1),[j,Y]=n.useState(null),y=n.useRef(null),H=n.useRef(null),Z=new Set(r.map(e=>e.value)),M=b.get(m),g=new Set((M?M.split(","):[]).filter(e=>Z.has(e))),i=r.filter(e=>g.has(e.value)),U=g.size===0,c=n.useCallback(()=>{const e=y.current;if(!e)return;const t=e.getBoundingClientRect();Y({top:t.bottom+4,left:t.left})},[]);n.useEffect(()=>{if(!l)return;c();const e=a=>{var o,S;const G=a.target;!((o=y.current)===null||o===void 0)&&o.contains(G)||!((S=H.current)===null||S===void 0)&&S.contains(G)||w(!1)},t=a=>{a.key==="Escape"&&w(!1)};return window.addEventListener("scroll",c,!0),window.addEventListener("resize",c),document.addEventListener("mousedown",e),document.addEventListener("keydown",t),()=>{window.removeEventListener("scroll",c,!0),window.removeEventListener("resize",c),document.removeEventListener("mousedown",e),document.removeEventListener("keydown",t)}},[l,c]);const B=n.useCallback(e=>{const t=new URLSearchParams(b.toString());e.size===0?t.delete(m):t.set(m,r.filter(o=>e.has(o.value)).map(o=>o.value).join(","));const a=t.toString();V.replace(a?`${x}?${a}`:x,{scroll:!1})},[V,x,b,m,r]),ee=e=>{const t=new Set(g);t.has(e)?t.delete(e):t.add(e),B(t)};return s.jsxs("div",{className:v("relative",X),children:[s.jsxs("button",{ref:y,type:"button",onClick:()=>w(e=>!e),"aria-haspopup":"listbox","aria-expanded":l,className:v("inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs font-medium transition-colors hover:bg-accent/50",l&&"ring-1 ring-ring"),children:[i.length===0?s.jsx("span",{className:"text-muted-foreground",children:f??F}):s.jsxs("span",{className:"flex items-center gap-1.5 text-foreground",children:[i.some(e=>h(e))?s.jsx("span",{className:"flex -space-x-1",children:i.slice(0,4).map(e=>h(e)&&s.jsx("span",{"aria-hidden":!0,className:"h-2.5 w-2.5 rounded-full ring-1 ring-background",style:{background:h(e)}},e.value))}):null,i.length===1?i[0].label:`${i.length} ${W}`]}),s.jsx(oe,{className:v("h-3.5 w-3.5 text-muted-foreground transition-transform",l&&"rotate-180")})]}),l&&j?ae.createPortal(s.jsxs("div",{ref:H,role:"listbox","aria-multiselectable":!0,style:{position:"fixed",top:j.top,left:j.left},className:"z-[60] max-h-72 w-56 overflow-auto rounded-md border border-border bg-card p-1 shadow-lg",children:[Q?null:s.jsxs("button",{type:"button",role:"option","aria-selected":U,onClick:()=>B(new Set),className:"flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent/60 hover:text-foreground",children:[s.jsx("span",{className:"flex h-3.5 w-3.5 items-center justify-center",children:U?s.jsx(I,{className:"h-3.5 w-3.5"}):null}),F]}),r.map(e=>{const t=g.has(e.value),a=h(e);return s.jsxs("button",{type:"button",role:"option","aria-selected":t,onClick:()=>ee(e.value),className:v("flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent/60",t?"text-foreground":"text-muted-foreground hover:text-foreground"),children:[s.jsx("span",{className:"flex h-3.5 w-3.5 items-center justify-center",children:t?s.jsx(I,{className:"h-3.5 w-3.5"}):null}),a?s.jsx("span",{"aria-hidden":!0,className:"h-2.5 w-2.5 shrink-0 rounded-full",style:{background:a}}):null,s.jsx("span",{className:"truncate",children:e.label})]},e.value)})]}),document.body):null]})}J.__docgenInfo={description:`A themed multi-select dropdown backed by the URL query string (default
\`?status=\`), matching the projects dropdown (\`ProjectMultiSelect\`): selected
values narrow the view, an empty selection means "all". The query param is the
source of truth, so filters are shareable and link-driven (e.g.
/tasks?status=backlog). Built from app tokens so it tracks the theme, and the
menu renders in a portal with fixed positioning so it's never clipped.`,methods:[],displayName:"FilterPills",props:{options:{required:!0,tsType:{name:"Array",elements:[{name:"signature",type:"object",raw:`{
  value: string;
  label: string;
  /** HSL triple ("142 71% 45%") or a CSS var ref ("var(--status-done)"), used inside hsl(...). */
  hue?: string;
  /** Raw CSS color (e.g. a project's hex tag). Takes precedence over \`hue\` when set. */
  color?: string;
}`,signature:{properties:[{key:"value",value:{name:"string",required:!0}},{key:"label",value:{name:"string",required:!0}},{key:"hue",value:{name:"string",required:!1},description:'HSL triple ("142 71% 45%") or a CSS var ref ("var(--status-done)"), used inside hsl(...).'},{key:"color",value:{name:"string",required:!1},description:"Raw CSS color (e.g. a project's hex tag). Takes precedence over `hue` when set."}]}}],raw:"FilterOption[]"},description:""},paramKey:{required:!1,tsType:{name:"string"},description:'Query-string key the active values are written to. Defaults to "status".',defaultValue:{value:"'status'",computed:!1}},allLabel:{required:!1,tsType:{name:"string"},description:"Label for the menu row that clears all filters, and the trigger's empty state.",defaultValue:{value:"'All'",computed:!1}},hideAll:{required:!1,tsType:{name:"boolean"},description:`Hide the "All" (clear) row — for a single-option toggle. The value is still
 cleared by toggling the lone option off.`,defaultValue:{value:"false",computed:!1}},placeholder:{required:!1,tsType:{name:"string"},description:"Trigger label shown when nothing is selected. Falls back to `allLabel`."},countNoun:{required:!1,tsType:{name:"string"},description:'Noun used in the "N <noun>" trigger label for 2+ selections.',defaultValue:{value:"'selected'",computed:!1}},className:{required:!1,tsType:{name:"string"},description:""}}};var _,k,N,C,q,L,P,E,R,T,A,O,$,z,D;const K=ne.map(r=>({value:r.status,label:r.label,hue:`var(${r.hueVar})`})),le=[{value:"proj-web",label:"Midnite Web",color:"#7c3aed"},{value:"proj-gw",label:"Gateway",color:"#0ea5e9"},{value:"proj-docs",label:"Docs",color:"#facc15"}],me={title:"Components/FilterPills",component:J,parameters:{nextjs:{navigation:{pathname:"/tasks"}}}},d={args:{options:K}},u={args:{options:K},parameters:{nextjs:{navigation:{pathname:"/tasks",query:{status:"todo,wip"}}}}},p={args:{options:le,paramKey:"project",allLabel:"All projects"},parameters:{nextjs:{navigation:{pathname:"/tasks",query:{project:"proj-web"}}}}};d.parameters={...d.parameters,docs:{...(_=d.parameters)===null||_===void 0?void 0:_.docs,source:{originalSource:`{
  args: {
    options: statusOptions
  }
}`,...(N=d.parameters)===null||N===void 0||(k=N.docs)===null||k===void 0?void 0:k.source},description:{story:'No query param set — the trigger shows the "All" label.',...(q=d.parameters)===null||q===void 0||(C=q.docs)===null||C===void 0?void 0:C.description}}};u.parameters={...u.parameters,docs:{...(L=u.parameters)===null||L===void 0?void 0:L.docs,source:{originalSource:`{
  args: {
    options: statusOptions
  },
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/tasks',
        query: {
          status: 'todo,wip'
        }
      }
    }
  }
}`,...(E=u.parameters)===null||E===void 0||(P=E.docs)===null||P===void 0?void 0:P.source},description:{story:"`/tasks?status=todo,wip` — two statuses selected; the trigger summarises them.",...(T=u.parameters)===null||T===void 0||(R=T.docs)===null||R===void 0?void 0:R.description}}};p.parameters={...p.parameters,docs:{...(A=p.parameters)===null||A===void 0?void 0:A.docs,source:{originalSource:`{
  args: {
    options: projectOptions,
    paramKey: 'project',
    allLabel: 'All projects'
  },
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/tasks',
        query: {
          project: 'proj-web'
        }
      }
    }
  }
}`,...($=p.parameters)===null||$===void 0||(O=$.docs)===null||O===void 0?void 0:O.source},description:{story:"Options can carry raw hex colors instead of status hues (e.g. projects).",...(D=p.parameters)===null||D===void 0||(z=D.docs)===null||z===void 0?void 0:z.description}}};const ge=["NoneSelected","SomeSelected","ProjectColors"];export{d as NoneSelected,p as ProjectColors,u as SomeSelected,ge as __namedExportsOrder,me as default};
