import{aU as n,av as R}from"./iframe-DFwXKKze.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-SnapzUuN.js";import{P as H}from"./project-modal-D2vQMyou.js";import"./preload-helper-Dp1pzeXC.js";import"./index-D8zdoxP1.js";import"./Select-ef7c0426.esm-CylYiOPF.js";import"./chevron-down-2_2I1SEr.js";import"./check-DB_OHTiC.js";import"./index-BLJqP3j_.js";import"./triangle-alert-4eu2gen_.js";import"./export-menu-aDNRuH7A.js";import"./client-tMOJ4ydm.js";import"./markdown-preview-BLgFCWUw.js";import"./index.dom-D_wTd2ti.js";import"./file-text-CGBU4kWK.js";import"./copy-IYEtLVHE.js";import"./file-code-corner-BVtxF6tM.js";import"./loader-circle-DpEvdobX.js";import"./api-Up5gC-8X.js";import"./folder-open-B5gY8jxb.js";import"./folder-CCiyf8NC.js";import"./tag-color-picker-DoY2clTl.js";import"./project-tag-Bztb5mj5.js";import"./sparkles-BExB_r3A.js";import"./brain-CYMHVj73.js";import"./chevron-right-9kzAnIpR.js";import"./markdown-editor-DE4jkNJ_.js";import"./pencil-BfCx7IzJ.js";import"./trash-2-8U9L7hap.js";import"./templates-B6M1OYb3.js";import"./plus-CLU5aO2M.js";import"./task-row-DWsd2T4S.js";import"./i18n-labels-DalO5Rnc.js";import"./selectable-icon-CmOcFI2Z.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-CV1cxx3g.js";import"./arrow-left-DH62WaRP.js";var s,c,p,l,d,m,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ya={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(d=o.parameters)===null||d===void 0||(l=d.docs)===null||l===void 0?void 0:l.description}}};i.parameters={...i.parameters,docs:{...(m=i.parameters)===null||m===void 0?void 0:m.docs,source:{originalSource:`{
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
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const Ta=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,Ta as __namedExportsOrder,ya as default};
