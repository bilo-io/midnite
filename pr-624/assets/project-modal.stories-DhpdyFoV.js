import{b0 as n,ax as R}from"./iframe-DvByxioD.js";import{c as N,q as x,k as B,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-Bcx214oV.js";import{P as H}from"./project-modal-ChCMWXZN.js";import"./preload-helper-Dp1pzeXC.js";import"./index-C0qaSSk1.js";import"./Select-ef7c0426.esm-Ty80QyRq.js";import"./chevron-down-CrSnI0MB.js";import"./check-BmdAJ142.js";import"./export-menu-7U64r0U-.js";import"./client-CdoCQXk-.js";import"./markdown-preview-DJ2xJ8gh.js";import"./index.dom-D_wTd2ti.js";import"./copy-DoDwlRFX.js";import"./file-code-corner-BZ9oTKMJ.js";import"./file-text-B4NG_tRo.js";import"./loader-circle-CvQGBtOH.js";import"./api-D91Cefj8.js";import"./folder-open-DRMazgfb.js";import"./folder-CG7wja2P.js";import"./tag-color-picker-D-MhImot.js";import"./project-tag-DxYlEiEh.js";import"./sparkles-ToWXMYDB.js";import"./brain-BwFknR46.js";import"./chevron-right-CfaBSBdB.js";import"./markdown-editor-Csj4Hu2O.js";import"./pencil-CN0JRahP.js";import"./trash-2-D2NQfeTy.js";import"./templates-jCLDy0m8.js";import"./project-template-labels-C2fU2Z0o.js";import"./plus-CfS_mCeQ.js";import"./task-row-B0o4cy59.js";import"./blocked-badge-BBKtgoaB.js";import"./selectable-icon-Dk86yx9v.js";import"./hover-expand-button-Djv4HDEo.js";import"./index-CQIuqQSb.js";import"./data-refresh-VlN73lkB.js";import"./rotate-ccw-WZSPukN1.js";import"./play-CC0P8I4F.js";import"./square-terminal-Cp0OQre0.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-T-syrlW0.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[x,B],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[x,B]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
