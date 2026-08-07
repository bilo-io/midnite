import{b1 as n,aw as R}from"./iframe-BH5Vu7l0.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-CttaH42l.js";import{P as H}from"./project-modal-BmpBKGnV.js";import"./preload-helper-Dp1pzeXC.js";import"./index-CZ1fkoJS.js";import"./Select-ef7c0426.esm-CEOiQR-w.js";import"./chevron-down-CKuwVSNh.js";import"./check-CwJYw9in.js";import"./export-menu-DKn1a0s-.js";import"./client-PTfR8Q-c.js";import"./markdown-preview-Dj0hk5M4.js";import"./index.dom-D_wTd2ti.js";import"./copy-CiEJefyb.js";import"./file-code-corner-cMCiIy_h.js";import"./file-text-DX3T7lxH.js";import"./loader-circle-BbPBstPe.js";import"./api-BnZ-InWP.js";import"./folder-open-vhHGbrgT.js";import"./folder-D4SYY6tq.js";import"./tag-color-picker-oSOv-nfi.js";import"./project-tag-B6rdhKlb.js";import"./sparkles-nP1Yqm9-.js";import"./brain-CIBh3drD.js";import"./chevron-right-B9t_4A2h.js";import"./markdown-editor-DwJs9ALQ.js";import"./pencil-DNW-Qv3M.js";import"./trash-2-Bjf3jMDW.js";import"./templates-C-27Q0_o.js";import"./project-template-labels-CXC81YpB.js";import"./plus-DQUXpXnc.js";import"./task-row-u8Ns_NSK.js";import"./blocked-badge-D58i74ty.js";import"./selectable-icon-Bm0dbH3I.js";import"./hover-expand-button-DYPPJxWH.js";import"./index-CqsZ_EAC.js";import"./data-refresh-CdkjdyD7.js";import"./rotate-ccw-DyjD-Gco.js";import"./play-BEuaqbtD.js";import"./square-terminal-D9pu7IxS.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-D3-uo56Y.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
