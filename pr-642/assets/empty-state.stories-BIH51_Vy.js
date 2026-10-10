import{b4 as _}from"./iframe-BgzrFP2X.js";import{E as h}from"./empty-state-BaYq37z9.js";import{F as g}from"./folder-open-uh_nuEFc.js";import"./preload-helper-Dp1pzeXC.js";import"./plus-CJfMPALt.js";var a,n,r,i,s,c,l,p,d,m;const{expect:y,fn:A,userEvent:j,within:w}=__STORYBOOK_MODULE_TEST__,W={title:"Components/EmptyState",component:h,args:{onAction:A()},decorators:[o=>_.jsx("div",{className:"max-w-lg",children:_.jsx(o,{})})]},e={args:{Icon:g,title:"No projects yet",description:"Group related tasks under a project to plan and track them together.",actionLabel:"New project"},play:async({args:o,canvasElement:v})=>{const u=w(v);await j.click(u.getByRole("button",{name:"New project"})),await y(o.onAction).toHaveBeenCalledOnce()}},t={args:{title:"Nothing here"}};e.parameters={...e.parameters,docs:{...(a=e.parameters)===null||a===void 0?void 0:a.docs,source:{originalSource:`{
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
}`,...(r=e.parameters)===null||r===void 0||(n=r.docs)===null||n===void 0?void 0:n.source},description:{story:"Icon + heading + hint + the prominent pill CTA.",...(s=e.parameters)===null||s===void 0||(i=s.docs)===null||i===void 0?void 0:i.description}}};t.parameters={...t.parameters,docs:{...(c=t.parameters)===null||c===void 0?void 0:c.docs,source:{originalSource:`{
  args: {
    title: 'Nothing here'
  }
}`,...(p=t.parameters)===null||p===void 0||(l=p.docs)===null||l===void 0?void 0:l.source},description:{story:"No icon, no CTA — the barest form.",...(m=t.parameters)===null||m===void 0||(d=m.docs)===null||d===void 0?void 0:d.description}}};const b=["WithAction","Minimal"];export{t as Minimal,e as WithAction,b as __namedExportsOrder,W as default};
