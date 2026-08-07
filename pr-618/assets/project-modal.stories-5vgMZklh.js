import{b1 as n,ax as R}from"./iframe-KMlIBV4_.js";import{c as N,q as x,k as B,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-Bj8trpau.js";import{P as H}from"./project-modal-C6z1TT70.js";import"./preload-helper-Dp1pzeXC.js";import"./index-B9j58Npd.js";import"./Select-ef7c0426.esm-lYMvhqfW.js";import"./chevron-down-DflNbZYE.js";import"./check-DM_W3Lsg.js";import"./export-menu-BNLWA_Od.js";import"./client-Cvcsr1ry.js";import"./markdown-preview-DijPI9Rh.js";import"./index.dom-D_wTd2ti.js";import"./copy-BKZcA5N7.js";import"./file-code-corner-g8Vw8dVk.js";import"./file-text-CWb5SI4n.js";import"./loader-circle-qjzoEtaa.js";import"./api-Y_bSZqsN.js";import"./folder-open-MXmDq0wS.js";import"./folder-D7rpVmXA.js";import"./tag-color-picker-CH4zrxZ_.js";import"./project-tag-C98ITMV0.js";import"./sparkles-BEKEN9Zg.js";import"./brain-epGdpGSq.js";import"./chevron-right-3VDnU3Ty.js";import"./markdown-editor-Bnq-Mz_i.js";import"./pencil-C9QBfqEB.js";import"./trash-2-DSS3jmYl.js";import"./templates-CiDP9Sw1.js";import"./project-template-labels-MqbbVOlY.js";import"./plus-Dp4wqKtX.js";import"./task-row-BzMhkXbR.js";import"./blocked-badge-1DFYjmNn.js";import"./selectable-icon-TmefpPon.js";import"./hover-expand-button-BfmxtdL8.js";import"./index-B7eozYAN.js";import"./data-refresh-cwGi3ZJD.js";import"./rotate-ccw-BRJJyRnZ.js";import"./play-NkoGXNnp.js";import"./square-terminal-BG07kAiz.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-QDlNF87M.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[x,B],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[x,B]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
