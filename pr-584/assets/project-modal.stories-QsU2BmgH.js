import{aX as n,aw as R}from"./iframe-BGGWusgs.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-CBneAScH.js";import{P as H}from"./project-modal-HCpQOSn6.js";import"./preload-helper-Dp1pzeXC.js";import"./index-Bx5wawIz.js";import"./Select-ef7c0426.esm-CG2SyMv8.js";import"./chevron-down-BFqZc10N.js";import"./check-B0dRupHv.js";import"./index-rVQyAVRS.js";import"./triangle-alert-Blxu68zT.js";import"./export-menu-BjTXEqg7.js";import"./client-BcZAQ13-.js";import"./markdown-preview-B6Y7Js1a.js";import"./index.dom-D_wTd2ti.js";import"./file-text-CivaV6k6.js";import"./copy-C0cQTeL_.js";import"./file-code-corner-CJNxOFQZ.js";import"./loader-circle-C0cIjFG1.js";import"./api-D5VM3IxG.js";import"./folder-open-C_Cfawqk.js";import"./folder-xYweUr0i.js";import"./tag-color-picker-B5ycm8oF.js";import"./project-tag-1HkIusN0.js";import"./sparkles-C1HXWVxv.js";import"./brain-gtmEW_C-.js";import"./chevron-right-D3gQUuo8.js";import"./markdown-editor-C2VRYwEQ.js";import"./pencil-CKXR88L7.js";import"./trash-2-Dk0Y91zc.js";import"./templates-FMKuZhxn.js";import"./plus-iDY-sqNh.js";import"./task-row-Bpe3m2LQ.js";import"./blocked-badge-DEKs6YNE.js";import"./selectable-icon-C14z8wiM.js";import"./hover-expand-button-CSn_MDaw.js";import"./index-D9GBGFsA.js";import"./data-refresh-B949DLW7.js";import"./rotate-ccw-D1olbIDU.js";import"./play-KRaSSIrP.js";import"./square-terminal-CoodDk8e.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-DMTk7YeD.js";var s,c,p,m,l,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ha={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
