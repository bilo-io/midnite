import{a_ as n,aw as R}from"./iframe-Cb7PBVYS.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-2HT39zEO.js";import{P as H}from"./project-modal-BMl2z_gM.js";import"./preload-helper-Dp1pzeXC.js";import"./index--oLvLpmy.js";import"./Select-ef7c0426.esm-mrjwpIrQ.js";import"./chevron-down-BE4OmK8O.js";import"./check-BEJLG4Or.js";import"./export-menu-B23ig21x.js";import"./client-A6s_mxT3.js";import"./markdown-preview-BWz7tnd4.js";import"./index.dom-D_wTd2ti.js";import"./file-text-DvdSvupN.js";import"./copy-BR7xPCZ2.js";import"./file-code-corner-Dlf3mccS.js";import"./loader-circle-BmDd6QAp.js";import"./api-Cq2uoq4K.js";import"./folder-open-Ezu1fdtW.js";import"./folder-Dk9ix3bp.js";import"./tag-color-picker-CqZnfuxq.js";import"./project-tag-Fghg7_F_.js";import"./sparkles-DrT786gv.js";import"./brain-BPLlfK-b.js";import"./chevron-right-txCObAfp.js";import"./markdown-editor-DT215J3_.js";import"./pencil-CyhCnKt8.js";import"./trash-2-D_C_eorj.js";import"./templates-BU6FSYLN.js";import"./project-template-labels-DpEAagZz.js";import"./plus-DkOE9uHp.js";import"./task-row-CSPUWkQe.js";import"./blocked-badge-CUKvQQ8n.js";import"./selectable-icon-DvMjPvdx.js";import"./hover-expand-button-ZWnX9lWo.js";import"./index-Cm8TjMWq.js";import"./data-refresh-B1lry22o.js";import"./rotate-ccw-DJ1HzBrz.js";import"./play-B7DyMYQE.js";import"./square-terminal-Vj2wNsHz.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-CuIZjOag.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
