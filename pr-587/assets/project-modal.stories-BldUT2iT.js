import{aZ as n,ax as R}from"./iframe-Bs5jINoK.js";import{c as N,q as x,k as B,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-Dz45KeX3.js";import{P as H}from"./project-modal-BwpWABrh.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DDddO7wA.js";import"./Select-ef7c0426.esm-BBFktxgK.js";import"./chevron-down-BepPUQ6p.js";import"./check-9xLPFIG4.js";import"./index-quOr8a_U.js";import"./triangle-alert-x_nVslZC.js";import"./export-menu-DsEGPmHC.js";import"./client-DLpOz3UU.js";import"./markdown-preview-DWxl1kPB.js";import"./index.dom-D_wTd2ti.js";import"./file-text-CfjJuriH.js";import"./copy-CkgZphPo.js";import"./file-code-corner-TKZu3rBI.js";import"./loader-circle-0CARkvZS.js";import"./api-C3a39Hg4.js";import"./folder-open-B2NWE6YQ.js";import"./folder-CpwCLpl-.js";import"./tag-color-picker-C7dPboCK.js";import"./project-tag-BnQrMNXL.js";import"./sparkles-BxoLzgSl.js";import"./brain-DyOgEQ5Q.js";import"./chevron-right-BnvYYCQe.js";import"./markdown-editor-DfNDEf_U.js";import"./pencil-Cuz71kFf.js";import"./trash-2-B5wTS88t.js";import"./templates-ByrkpCcU.js";import"./plus-Qc9ACr5e.js";import"./task-row-uONGqaMi.js";import"./blocked-badge-CXCfhD2e.js";import"./selectable-icon-DW_3zi7p.js";import"./hover-expand-button-Dd38FM5V.js";import"./index-CMZxoKaS.js";import"./data-refresh-C0PAI0Eq.js";import"./rotate-ccw-RqUeLbs2.js";import"./play-ynOJJHZc.js";import"./square-terminal-DwLv4nUI.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-CAw3oiGW.js";var s,c,p,m,l,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ha={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[x,B],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[x,B]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(l=o.parameters)===null||l===void 0||(m=l.docs)===null||m===void 0?void 0:m.description}}};i.parameters={...i.parameters,docs:{...(d=i.parameters)===null||d===void 0?void 0:d.docs,source:{originalSource:`{
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
}`,...(u=i.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.source},description:{story:"Editing a project — fields pre-filled, with tasks + a scoped memory surfaced.",...(w=i.parameters)===null||w===void 0||(_=w.docs)===null||_===void 0?void 0:_.description}}};r.parameters={...r.parameters,docs:{...(g=r.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
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
    const planTab = within(dialog).getByRole('tab', {
      name: /plan/i
    });
    await userEvent.click(planTab);
    await expect(planTab).toHaveAttribute('aria-selected', 'true');
  }
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const fa=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,fa as __namedExportsOrder,ha as default};
