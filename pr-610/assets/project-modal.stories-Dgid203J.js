import{a$ as n,aw as R}from"./iframe-DA-MmuZw.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-Cc7YlOSZ.js";import{P as H}from"./project-modal-GgQU1bCy.js";import"./preload-helper-Dp1pzeXC.js";import"./index-tYTLESo8.js";import"./Select-ef7c0426.esm-BVAl8g99.js";import"./chevron-down-BOx3_HW8.js";import"./check-DkS9Xb5l.js";import"./export-menu-CsfijcnX.js";import"./client-CGIvN_mh.js";import"./markdown-preview-MhW89Uaq.js";import"./index.dom-D_wTd2ti.js";import"./copy-CG7jbJzt.js";import"./file-code-corner-PksY5g-K.js";import"./file-text-C8WtTLjo.js";import"./loader-circle-DzzZ9Inu.js";import"./api-CbRpmCQt.js";import"./folder-open-Cz-x59Jk.js";import"./folder-D6R444ai.js";import"./tag-color-picker-DjcFxtks.js";import"./project-tag-6f9PbsZs.js";import"./sparkles-ABW0C3Hx.js";import"./brain-kshfOTAZ.js";import"./chevron-right-BEkAz4FU.js";import"./markdown-editor-RF3tNKqH.js";import"./pencil-tytP-5Rw.js";import"./trash-2-BmsQ3SCX.js";import"./templates-DHKF3B4w.js";import"./project-template-labels-Bw0GftB2.js";import"./plus-BOF2GYbE.js";import"./task-row-BgCOjIdG.js";import"./blocked-badge-rzUZFTft.js";import"./selectable-icon-CT-psJQT.js";import"./hover-expand-button-0GEzJP0Z.js";import"./index-CPkh6UQJ.js";import"./data-refresh-D7HNuLbI.js";import"./rotate-ccw-BtUxzF9w.js";import"./play-ZHYVxNTk.js";import"./square-terminal-ByXmHm-T.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-ssqVjSYO.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
