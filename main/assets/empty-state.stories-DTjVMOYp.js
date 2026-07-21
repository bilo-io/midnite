import{aX as e,aI as y}from"./iframe-Chfe_yyu.js";import{P as N}from"./plus-k-gCTPaN.js";import{F as j}from"./folder-open-CBfTqjmP.js";import"./preload-helper-Dp1pzeXC.js";function b({Icon:t,title:a,description:o,actionLabel:f,onAction:x,action:s,className:_}){return e.jsxs("div",{className:y("flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/60 surface-glass px-6 py-16 text-center",_),children:[t?e.jsxs("div",{className:"relative",children:[e.jsx("div",{"aria-hidden":!0,className:"absolute inset-0 -z-10 rounded-2xl bg-foreground/5 blur-xl"}),e.jsx("div",{className:"flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-card/70 text-muted-foreground shadow-sm",children:e.jsx(t,{className:"h-7 w-7"})})]}):null,e.jsxs("div",{className:"space-y-1.5",children:[e.jsx("h3",{className:"text-base font-semibold tracking-tight",children:a}),o?e.jsx("p",{className:"mx-auto max-w-sm text-sm text-muted-foreground",children:o}):null]}),s??(f&&x?e.jsxs("button",{type:"button",onClick:x,className:"group mt-1 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:shadow-md hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",children:[e.jsx(N,{className:"h-4 w-4 transition-transform duration-200 group-hover:rotate-90"}),f]}):null)]})}b.__docgenInfo={description:"The shared empty state for every collection: a dashed panel with the resource\nicon in a soft tile, a heading + hint, and a prominent pill add-button whose\nplus rotates on hover. Pass `action` for a non-button CTA.",methods:[],displayName:"EmptyState",props:{Icon:{required:!1,tsType:{name:"LucideIcon"},description:"The collection's resource icon, shown in the decorative tile."},title:{required:!0,tsType:{name:"string"},description:""},description:{required:!1,tsType:{name:"ReactNode"},description:""},actionLabel:{required:!1,tsType:{name:"string"},description:'Convenience CTA: renders the large pill "+ {actionLabel}" button.'},onAction:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},action:{required:!1,tsType:{name:"ReactNode"},description:"Custom action node, used instead of actionLabel/onAction (e.g. a menu button)."},className:{required:!1,tsType:{name:"string"},description:""}}};var i,c,d,l,m,p,u,h,v,g;const{expect:w,fn:T,userEvent:A,within:E}=__STORYBOOK_MODULE_TEST__,q={title:"Components/EmptyState",component:b,args:{onAction:T()},decorators:[t=>e.jsx("div",{className:"max-w-lg",children:e.jsx(t,{})})]},n={args:{Icon:j,title:"No projects yet",description:"Group related tasks under a project to plan and track them together.",actionLabel:"New project"},play:async({args:t,canvasElement:a})=>{const o=E(a);await A.click(o.getByRole("button",{name:"New project"})),await w(t.onAction).toHaveBeenCalledOnce()}},r={args:{title:"Nothing here"}};n.parameters={...n.parameters,docs:{...(i=n.parameters)===null||i===void 0?void 0:i.docs,source:{originalSource:`{
  args: {
    Icon: FolderOpen,
    title: 'No projects yet',
    description: 'Group related tasks under a project to plan and track them together.',
    actionLabel: 'New project'
  },
  play: async ({
    args,
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', {
      name: 'New project'
    }));
    await expect(args.onAction).toHaveBeenCalledOnce();
  }
}`,...(d=n.parameters)===null||d===void 0||(c=d.docs)===null||c===void 0?void 0:c.source},description:{story:"Icon + heading + hint + the prominent pill CTA.",...(m=n.parameters)===null||m===void 0||(l=m.docs)===null||l===void 0?void 0:l.description}}};r.parameters={...r.parameters,docs:{...(p=r.parameters)===null||p===void 0?void 0:p.docs,source:{originalSource:`{
  args: {
    title: 'Nothing here'
  }
}`,...(h=r.parameters)===null||h===void 0||(u=h.docs)===null||u===void 0?void 0:u.source},description:{story:"No icon, no CTA — the barest form.",...(g=r.parameters)===null||g===void 0||(v=g.docs)===null||v===void 0?void 0:v.description}}};const S=["WithAction","Minimal"];export{r as Minimal,n as WithAction,S as __namedExportsOrder,q as default};
