import{aX as n,ay as R}from"./iframe-CPAYwQxp.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-BKvr9oOI.js";import{P as H}from"./project-modal-BQcjILlZ.js";import"./preload-helper-Dp1pzeXC.js";import"./index-Desl17D3.js";import"./Select-ef7c0426.esm-x5sLzWHH.js";import"./chevron-down-LwuG85d9.js";import"./check-B3uGI09g.js";import"./index-C_FbQ7B4.js";import"./triangle-alert-DTsL3LTG.js";import"./export-menu-Be5rDs5F.js";import"./client-CMb9gmEH.js";import"./markdown-preview-DH1ykCN_.js";import"./index.dom-D_wTd2ti.js";import"./file-text-Diq8UEiS.js";import"./copy-DWXsTuYy.js";import"./file-code-corner-DTxmWNE0.js";import"./loader-circle-BLkPhJRK.js";import"./api-HGRhlxo0.js";import"./folder-open-CobQYDha.js";import"./folder-Bng52scK.js";import"./tag-color-picker-rzoYjKM9.js";import"./project-tag-DdrRuVy9.js";import"./sparkles-B_s3InOR.js";import"./brain-BEysMyWo.js";import"./chevron-right-DNwiGD5l.js";import"./markdown-editor-DWxYmDnA.js";import"./pencil-DtoLVncd.js";import"./trash-2-QcMxYDDa.js";import"./templates-DUUZz1L7.js";import"./plus-0FRerCOS.js";import"./task-row-Do95tU1s.js";import"./i18n-labels-B3NVMLIw.js";import"./selectable-icon-CG3oIsF_.js";import"./hover-expand-button-G8BB-nSa.js";import"./index-Df41uKQS.js";import"./data-refresh-BfcWmvWJ.js";import"./rotate-ccw-D3xBszkK.js";import"./play-IKd_-JNz.js";import"./square-terminal-CcfgP4IB.js";import"./task-columns-BUR8DOSo.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(m=o.parameters)===null||m===void 0||(l=m.docs)===null||l===void 0?void 0:l.description}}};i.parameters={...i.parameters,docs:{...(d=i.parameters)===null||d===void 0?void 0:d.docs,source:{originalSource:`{
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
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const ha=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,ha as __namedExportsOrder,ja as default};
