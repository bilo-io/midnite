import{aX as n,ay as R}from"./iframe-D2e4yNJo.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-BHRu4OlN.js";import{P as H}from"./project-modal-2gLlg07Y.js";import"./preload-helper-Dp1pzeXC.js";import"./index-C-tYSUiV.js";import"./Select-ef7c0426.esm-Bqy0DnVB.js";import"./chevron-down-U-BDtWta.js";import"./check-B29RC21S.js";import"./index-mHhoxUdr.js";import"./triangle-alert-DLN9sZOz.js";import"./export-menu-BJ8JS6It.js";import"./client-BdZMxiyy.js";import"./markdown-preview-BBa0Vaob.js";import"./index.dom-D_wTd2ti.js";import"./file-text-ZZZjC27b.js";import"./copy-BzFazMVP.js";import"./file-code-corner-BbYpnq_Q.js";import"./loader-circle-CSlYwnFm.js";import"./api-CcMQtoRc.js";import"./folder-open-DsWjjVKq.js";import"./folder-Dm7RO5x7.js";import"./tag-color-picker-BH9q0jBd.js";import"./project-tag-BgTO4fuF.js";import"./sparkles-CPmB_0RF.js";import"./brain-DP973nVK.js";import"./chevron-right-BG6uaubw.js";import"./markdown-editor-BjRve0Gw.js";import"./pencil-BIbey_ZC.js";import"./trash-2-DYkOkBdr.js";import"./templates-CORcmm2E.js";import"./plus-CRyjpmYO.js";import"./task-row-BpvndXVa.js";import"./i18n-labels-rrdOrKK4.js";import"./selectable-icon-B5ndWLUe.js";import"./task-columns-BUR8DOSo.js";var s,c,p,l,d,m,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,wa={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const ga=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,ga as __namedExportsOrder,wa as default};
