import{H as D,F as I,I as M,r as G,n as c,f as v}from"./iframe-BmmrWt6z.js";import{C as Q}from"./task-columns-DXf2yYcn.js";import"./preload-helper-Dp1pzeXC.js";function R({options:r,paramKey:i="status",allLabel:E="All",hideAll:H=!1,className:V}){const A=D(),d=I(),p=M(),U=new Set(r.map(e=>e.value)),L=p.get(i),u=new Set((L?L.split(","):[]).filter(e=>U.has(e))),$=u.size===0,O=G.useCallback(e=>{const t=new URLSearchParams(p.toString());e.size===0?t.delete(i):t.set(i,r.filter(o=>e.has(o.value)).map(o=>o.value).join(","));const s=t.toString();A.replace(s?`${d}?${s}`:d,{scroll:!1})},[A,d,p,i,r]),z=e=>{const t=new Set(u);t.has(e)?t.delete(e):t.add(e),O(t)};return c.jsxs("div",{className:v("flex flex-wrap items-center gap-2",V),children:[H?null:c.jsx("button",{type:"button",onClick:()=>O(new Set),"aria-pressed":$,className:v("rounded-full border px-3 py-1 text-xs font-medium transition-colors",$?"border-foreground/20 bg-accent text-accent-foreground":"border-border/60 text-muted-foreground hover:bg-accent/50 hover:text-foreground"),children:E}),r.map(e=>{const t=u.has(e.value);var s;const o=(s=e.color)!==null&&s!==void 0?s:`hsl(${e.hue})`,m=T=>e.color?`color-mix(in srgb, ${e.color} ${T}%, transparent)`:`hsl(${e.hue} / ${T/100})`;return c.jsxs("button",{type:"button",onClick:()=>z(e.value),"aria-pressed":t,className:v("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",t?"text-foreground":"border-border/60 text-muted-foreground hover:bg-accent/50 hover:text-foreground"),style:t?{borderColor:m(50),backgroundColor:m(15)}:void 0,children:[c.jsx("span",{"aria-hidden":!0,className:"h-1.5 w-1.5 rounded-full",style:{background:o,boxShadow:t?`0 0 8px -1px ${m(70)}`:void 0}}),e.label]},e.value)})]})}R.__docgenInfo={description:`A row of toggleable filter pills backed by the URL query string. Selecting pills
narrows the view to those values; the "All" pill clears the filter. Each pill is
tinted with the hue of the thing it filters. The query param is the source of truth,
so filters are shareable and link-driven (e.g. /tasks?status=backlog).`,methods:[],displayName:"FilterPills",props:{options:{required:!0,tsType:{name:"Array",elements:[{name:"signature",type:"object",raw:`{
  value: string;
  label: string;
  /** HSL triple ("142 71% 45%") or a CSS var ref ("var(--status-done)"), used inside hsl(...). */
  hue?: string;
  /** Raw CSS color (e.g. a project's hex tag). Takes precedence over \`hue\` when set. */
  color?: string;
}`,signature:{properties:[{key:"value",value:{name:"string",required:!0}},{key:"label",value:{name:"string",required:!0}},{key:"hue",value:{name:"string",required:!1},description:'HSL triple ("142 71% 45%") or a CSS var ref ("var(--status-done)"), used inside hsl(...).'},{key:"color",value:{name:"string",required:!1},description:"Raw CSS color (e.g. a project's hex tag). Takes precedence over `hue` when set."}]}}],raw:"FilterOption[]"},description:""},paramKey:{required:!1,tsType:{name:"string"},description:'Query-string key the active values are written to. Defaults to "status".',defaultValue:{value:"'status'",computed:!1}},allLabel:{required:!1,tsType:{name:"string"},description:"Label for the pill that clears all filters.",defaultValue:{value:"'All'",computed:!1}},hideAll:{required:!1,tsType:{name:"boolean"},description:'Hide the "All" pill — for a single-option toggle, where the lone pill is the toggle.',defaultValue:{value:"false",computed:!1}},className:{required:!1,tsType:{name:"string"},description:""}}};var h,g,f,S,b,_,x,j,y,w,k,C,q,N,P;const F=Q.map(r=>({value:r.status,label:r.label,hue:`var(${r.hueVar})`})),W=[{value:"proj-web",label:"Midnite Web",color:"#7c3aed"},{value:"proj-gw",label:"Gateway",color:"#0ea5e9"},{value:"proj-docs",label:"Docs",color:"#facc15"}],X={title:"Components/FilterPills",component:R,parameters:{nextjs:{navigation:{pathname:"/tasks"}}}},a={args:{options:F}},l={args:{options:F},parameters:{nextjs:{navigation:{pathname:"/tasks",query:{status:"todo,wip"}}}}},n={args:{options:W,paramKey:"project",allLabel:"All projects"},parameters:{nextjs:{navigation:{pathname:"/tasks",query:{project:"proj-web"}}}}};a.parameters={...a.parameters,docs:{...(h=a.parameters)===null||h===void 0?void 0:h.docs,source:{originalSource:`{
  args: {
    options: statusOptions
  }
}`,...(f=a.parameters)===null||f===void 0||(g=f.docs)===null||g===void 0?void 0:g.source},description:{story:'No query param set — the "All" pill is active.',...(b=a.parameters)===null||b===void 0||(S=b.docs)===null||S===void 0?void 0:S.description}}};l.parameters={...l.parameters,docs:{...(_=l.parameters)===null||_===void 0?void 0:_.docs,source:{originalSource:`{
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
}`,...(j=l.parameters)===null||j===void 0||(x=j.docs)===null||x===void 0?void 0:x.source},description:{story:"`/tasks?status=todo,wip` — two status pills lit with their column hues.",...(w=l.parameters)===null||w===void 0||(y=w.docs)===null||y===void 0?void 0:y.description}}};n.parameters={...n.parameters,docs:{...(k=n.parameters)===null||k===void 0?void 0:k.docs,source:{originalSource:`{
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
}`,...(q=n.parameters)===null||q===void 0||(C=q.docs)===null||C===void 0?void 0:C.source},description:{story:"Project pills carry raw hex colors instead of status hues.",...(P=n.parameters)===null||P===void 0||(N=P.docs)===null||N===void 0?void 0:N.description}}};const Y=["NoneSelected","SomeSelected","ProjectColors"];export{a as NoneSelected,n as ProjectColors,l as SomeSelected,Y as __namedExportsOrder,X as default};
