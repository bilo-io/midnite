import{a_ as n,aw as R}from"./iframe-DJr6MJVv.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-CluUIbRC.js";import{P as H}from"./project-modal-Bs5N-685.js";import"./preload-helper-Dp1pzeXC.js";import"./index-hbrwVbns.js";import"./Select-ef7c0426.esm-zhwlgMMb.js";import"./chevron-down-HB2J1Anq.js";import"./check-DuEQxwSI.js";import"./export-menu-TFKEbpuj.js";import"./client-DcyZYZNU.js";import"./markdown-preview-Dx2P5LX1.js";import"./index.dom-D_wTd2ti.js";import"./copy-TXiruySQ.js";import"./file-code-corner-I7KTWDG0.js";import"./file-text-BFHzi7tJ.js";import"./loader-circle-DImf1I08.js";import"./api-DcHHGle2.js";import"./folder-open-CxGhkIQb.js";import"./folder-Ccc2f9aO.js";import"./tag-color-picker-CjWc-Kkp.js";import"./project-tag-Dq6bNyMO.js";import"./sparkles-DIYf2cG4.js";import"./brain-DpG02gHu.js";import"./chevron-right-DcECicCq.js";import"./markdown-editor-B4G0kqMB.js";import"./pencil-BhOO_NR6.js";import"./trash-2-CcCpvt4V.js";import"./templates-BMgy5OtO.js";import"./project-template-labels-D3JsOzPU.js";import"./plus-J_FbhYk7.js";import"./task-row-C_QQxRWJ.js";import"./blocked-badge-B0c9Rmq9.js";import"./selectable-icon-BGLYMzoI.js";import"./hover-expand-button-Dd-IXMCn.js";import"./index-NR66JRm7.js";import"./data-refresh-BW1Pfaph.js";import"./rotate-ccw-7ng7t_aX.js";import"./play-B2GBdv2j.js";import"./square-terminal-DvIUHs4T.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-CDUqNqRe.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
