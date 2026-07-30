import{aX as n,ay as R}from"./iframe-BwJY7oEv.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-BWLEgn6B.js";import{P as H}from"./project-modal-Dk7Tbvuj.js";import"./preload-helper-Dp1pzeXC.js";import"./index-CE7JHhYG.js";import"./Select-ef7c0426.esm-BBB-BAyB.js";import"./chevron-down-BZMGNW4M.js";import"./check-AcI_hyI-.js";import"./index-BW56mZoE.js";import"./triangle-alert--7l-zhtC.js";import"./export-menu-DIzcKN83.js";import"./client-Cgp0f9p-.js";import"./markdown-preview-BUR3uZtm.js";import"./index.dom-D_wTd2ti.js";import"./file-text-CNNmYtRW.js";import"./copy-cCr--dEH.js";import"./file-code-corner-CsqNmcJP.js";import"./loader-circle-CKAnhzvz.js";import"./api-DkRHPdCK.js";import"./folder-open-CDfNeP9j.js";import"./folder-Dll_zjvJ.js";import"./tag-color-picker-BTEEoQ8i.js";import"./project-tag-BREQD1Xm.js";import"./sparkles-B2qAX_os.js";import"./brain-CU8nKeVN.js";import"./chevron-right-CluygHlW.js";import"./markdown-editor-Bz_AGZFR.js";import"./pencil-B8UEb5cL.js";import"./trash-2-BBi-QsYw.js";import"./templates-C8PW-OX1.js";import"./plus-BRy0NyH5.js";import"./task-row-D2gzdrwz.js";import"./i18n-labels-VTDvWeVQ.js";import"./selectable-icon-QxPS4uFx.js";import"./hover-expand-button-DP6M9a72.js";import"./index-ClTxKH5f.js";import"./data-refresh-BROK_YZF.js";import"./rotate-ccw-CH3hPw6W.js";import"./play-nur6Lilh.js";import"./square-terminal-urIBVInH.js";import"./task-columns-BUR8DOSo.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
