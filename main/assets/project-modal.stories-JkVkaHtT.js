import{a$ as n,aw as R}from"./iframe-C-gkDFgQ.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-DwL22qxK.js";import{P as H}from"./project-modal-Dm5uiO99.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DDe-Z3Ss.js";import"./Select-ef7c0426.esm-CLkRzUuj.js";import"./chevron-down-5G1usU0g.js";import"./check-DX4g8Z9e.js";import"./export-menu-Cv3T2Snh.js";import"./client-7jcxnK6I.js";import"./markdown-preview-CU9Fur4c.js";import"./index.dom-D_wTd2ti.js";import"./copy-MmwW1thq.js";import"./file-code-corner-B3rsW5Mw.js";import"./file-text-B6vis_Nc.js";import"./loader-circle-BlKNw-Xq.js";import"./api-C-1Iqnef.js";import"./folder-open-DQ_hJA-R.js";import"./folder-mqtI5Meo.js";import"./tag-color-picker-Cq-4Y0XD.js";import"./project-tag-BtOKRzmd.js";import"./sparkles-CXK3aYUJ.js";import"./brain-DZbNbhlV.js";import"./chevron-right-Du0_pD_h.js";import"./markdown-editor-DKvQ8F-y.js";import"./pencil-CjQSpOH2.js";import"./trash-2-son2HEdS.js";import"./templates-cLoTDIMW.js";import"./project-template-labels-DaCtgRjp.js";import"./plus-D3S0lqhN.js";import"./task-row-BloIELV0.js";import"./blocked-badge-Dzrksw0S.js";import"./selectable-icon-0lkI3B08.js";import"./hover-expand-button--VN45Qhn.js";import"./index-BLFwPiod.js";import"./data-refresh-CmU9bVHp.js";import"./rotate-ccw-Daf85h-f.js";import"./play-C9uEwDxF.js";import"./square-terminal-GgLVdHSR.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-f5WwPOoP.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
