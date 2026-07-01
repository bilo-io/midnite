import{n as s,T as R}from"./iframe-ce5oM0AF.js";import{c as N,q as B,k as x,p as j}from"./fixtures-CckvYj1j.js";import{a as P}from"./confirm-dialog-BxM--2Of.js";import{P as H}from"./project-modal-BrL4C2zg.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-DGARnL0d.js";import"./index-C-D1-SjS.js";import"./check-BrV9_Lvd.js";import"./triangle-alert-CztwGkeQ.js";import"./export-menu-jxMf7G0T.js";import"./client-DQ8z1_s7.js";import"./markdown-preview-Bl6ix1qC.js";import"./file-text-DkQNzVvw.js";import"./copy-BMzQ1PtY.js";import"./loader-circle-IIG2BbgX.js";import"./api-A95bhGP6.js";import"./inbound-CbJZzwyX.js";import"./folder-open-BLBsLiMt.js";import"./folder-DAbNizGQ.js";import"./project-tag-Ct1YiklI.js";import"./tag-color-picker-CkDAqv3E.js";import"./source-list-editor-CijAUQdi.js";import"./source-icon-VSSqbUt7.js";import"./globe-BjzqgFNh.js";import"./sticky-note-DbwGwMR8.js";import"./plus-BF1Edvfw.js";import"./external-link-Dk83g0A3.js";import"./task-row-Bx9lLFl4.js";import"./blocked-badge-BK71dQN9.js";import"./selectable-icon-DyYGwyi7.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-B8r8yOFg.js";import"./pencil-BmA4LaRE.js";import"./trash-2-DtvSetwc.js";import"./refresh-cw-BchbUz5o.js";import"./index-zNxvhokd.js";import"./lightbulb-CzZwhARf.js";import"./templates-B6M1OYb3.js";import"./sparkles-CwtMY8lX.js";import"./brain-ChCI1wye.js";import"./chevron-right-pfDUL98M.js";var n,c,p,m,d,l,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:L,within:t}=__STORYBOOK_MODULE_TEST__,ba={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>s.jsx(R,{children:s.jsx(P,{children:s.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},r={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},i={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),k=t(e).getByRole("tab",{name:/sources/i});await L.click(k),await f(k).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(n=o.parameters)===null||n===void 0?void 0:n.docs,source:{originalSource:`{
  args: {
    project: null
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'New project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue('');
  }
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(d=o.parameters)===null||d===void 0||(m=d.docs)===null||m===void 0?void 0:m.description}}};r.parameters={...r.parameters,docs:{...(l=r.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug],
    memories: [memoryProjectScoped],
    onSelectTask: fn()
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue(project.name);
  }
}`,...(u=r.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.source},description:{story:"Editing a project — fields pre-filled, with tasks + a scoped memory surfaced.",...(w=r.parameters)===null||w===void 0||(_=w.docs)===null||_===void 0?void 0:_.description}}};i.parameters={...i.parameters,docs:{...(g=i.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug]
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    const sourcesTab = within(dialog).getByRole('tab', {
      name: /sources/i
    });
    await userEvent.click(sourcesTab);
    await expect(sourcesTab).toHaveAttribute('aria-selected', 'true');
  }
}`,...(T=i.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Sources marks that tab selected.",...(b=i.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const ja=["New","Edit","SwitchTab"];export{r as Edit,o as New,i as SwitchTab,ja as __namedExportsOrder,ba as default};
