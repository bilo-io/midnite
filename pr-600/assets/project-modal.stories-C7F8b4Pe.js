import{a_ as n,aw as R}from"./iframe-CzW4mhwb.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-BUkuYmp6.js";import{P as H}from"./project-modal-7JUu6ACU.js";import"./preload-helper-Dp1pzeXC.js";import"./index-CgQBr1Pd.js";import"./Select-ef7c0426.esm-DMZqecfI.js";import"./chevron-down-DQyiikrp.js";import"./check-C_AEmsFb.js";import"./export-menu-C8PXYN_w.js";import"./client-B7WR-q-x.js";import"./markdown-preview-BVltBt-C.js";import"./index.dom-D_wTd2ti.js";import"./file-text-D0pe4I-k.js";import"./copy-CnLg691-.js";import"./file-code-corner-B7vSv4uo.js";import"./loader-circle-DhmxoIpP.js";import"./api-D5zsh0uM.js";import"./folder-open-DXa3-OsI.js";import"./folder-DNrnCBO0.js";import"./tag-color-picker-DUL_LuF_.js";import"./project-tag-BG6ktr-W.js";import"./sparkles-BZKOPIPL.js";import"./brain-KdhMDYv4.js";import"./chevron-right-Dk_NFXuc.js";import"./markdown-editor-DnhMjTK0.js";import"./pencil-D1Dyjxjd.js";import"./trash-2-BRS-ADtV.js";import"./templates-BZ9Wa5el.js";import"./project-template-labels-U69YeShX.js";import"./plus-O2gFqE6B.js";import"./task-row-PJ9bTd64.js";import"./blocked-badge-CYzhL4qp.js";import"./selectable-icon-gKQxA532.js";import"./hover-expand-button-BOrY3n9g.js";import"./index-CKsTKQJa.js";import"./data-refresh-CEKX9T89.js";import"./rotate-ccw-C9mJR1Lc.js";import"./play-BcL9fGhQ.js";import"./square-terminal-BQaWLVHK.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-C4RosFBs.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
