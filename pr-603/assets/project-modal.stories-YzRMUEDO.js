import{a$ as n,aw as R}from"./iframe-XPm5dhjm.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-D4gen3aF.js";import{P as H}from"./project-modal-DzNzf0jc.js";import"./preload-helper-Dp1pzeXC.js";import"./index-BTsRUR3M.js";import"./Select-ef7c0426.esm-CKeNqNZ4.js";import"./chevron-down-BK5giTyQ.js";import"./check-FAIbRrsX.js";import"./export-menu-5kT9Ye-x.js";import"./client-CYYMMRbB.js";import"./markdown-preview-9QFSXGvo.js";import"./index.dom-D_wTd2ti.js";import"./copy-BPYRkqZ7.js";import"./file-code-corner-j_moL2h5.js";import"./file-text-BmlgbZir.js";import"./loader-circle-DDpC-7eG.js";import"./api-Bijz-e3A.js";import"./folder-open-D-vwRbS7.js";import"./folder-CiX7Lq1P.js";import"./tag-color-picker-BgLTZur9.js";import"./project-tag-DM2UaxFS.js";import"./sparkles-BVFsqmvl.js";import"./brain-DLHl999-.js";import"./chevron-right-Ct8FBCGt.js";import"./markdown-editor-4vsP2Fii.js";import"./pencil-DTXKlYTI.js";import"./trash-2-ZngxfdtH.js";import"./templates-De664jZB.js";import"./project-template-labels-Bhz79kM6.js";import"./plus-Gyv73LtI.js";import"./task-row-5hKNWwyC.js";import"./blocked-badge-CITdoyra.js";import"./selectable-icon-TszLs4da.js";import"./hover-expand-button-BjA5F5DT.js";import"./index-Bj3i4008.js";import"./data-refresh-JQqPjJ5J.js";import"./rotate-ccw-BCgZkGfe.js";import"./play-BFmE2LpZ.js";import"./square-terminal-BmOUTe7a.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-CPfe5Oqx.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
