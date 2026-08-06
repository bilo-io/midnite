import{a$ as n,aw as R}from"./iframe-DQb38lZQ.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-5oU3ozre.js";import{P as H}from"./project-modal-D1K1Bw0D.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DO4yAhDv.js";import"./Select-ef7c0426.esm-BpceUwyK.js";import"./chevron-down-PJHNVAq5.js";import"./check-DSrraw-t.js";import"./export-menu-pC2DBNh7.js";import"./client-WbQZimAV.js";import"./markdown-preview-BIqlfSNV.js";import"./index.dom-D_wTd2ti.js";import"./copy-BUrwDEEh.js";import"./file-code-corner-sv_c2hPX.js";import"./file-text-BI1z-NvX.js";import"./loader-circle-CYxtW98j.js";import"./api-DMHn31eB.js";import"./folder-open-Dlp7CC0s.js";import"./folder-BDSdnKG1.js";import"./tag-color-picker-Bcl1LGmm.js";import"./project-tag-BoxH58v1.js";import"./sparkles-CiRq86MQ.js";import"./brain-DS79mDt0.js";import"./chevron-right-C1fXgXpC.js";import"./markdown-editor-ChacX4R2.js";import"./pencil-DAPDYqS7.js";import"./trash-2-C2puJV28.js";import"./templates-B4U7OnKQ.js";import"./project-template-labels-BcO8466v.js";import"./plus-DSr160EL.js";import"./task-row-DvHOBREF.js";import"./blocked-badge-GVeunpKo.js";import"./selectable-icon-B4pEkECc.js";import"./hover-expand-button-B6ra6ymS.js";import"./index-CoRihWUl.js";import"./data-refresh-BZMkQ7Eo.js";import"./rotate-ccw-BZhrfHxG.js";import"./play-BRuMDtsm.js";import"./square-terminal-CsxN38gF.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-sYtiSjlW.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
