import{aU as n,av as R}from"./iframe-G3xDzys3.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-BudCmPBp.js";import{P as H}from"./project-modal-sVghnggX.js";import"./preload-helper-Dp1pzeXC.js";import"./index-fhkGiQmC.js";import"./Select-ef7c0426.esm-BNEXNXid.js";import"./chevron-down-4pV-DDvK.js";import"./check-hWXIojSd.js";import"./index-DlMOO87E.js";import"./triangle-alert-CJTYIpHx.js";import"./export-menu-CAAeG-Ze.js";import"./client-BwyOVoCS.js";import"./markdown-preview-oIx4uwbH.js";import"./index.dom-D_wTd2ti.js";import"./file-text-DWrPJtlk.js";import"./copy-ymvXuccP.js";import"./file-code-corner-BPxLdlJU.js";import"./loader-circle-DVzC8C-W.js";import"./api-4F64Xvw2.js";import"./folder-open-BrorDjNv.js";import"./folder-0JPdRxcw.js";import"./tag-color-picker-Cj3jtMdy.js";import"./project-tag-DPBELIGT.js";import"./sparkles-B-_QxDsD.js";import"./brain-kGvkwywf.js";import"./chevron-right-DvaamM-t.js";import"./markdown-editor-BpIs7Yho.js";import"./pencil-C2DUBhZq.js";import"./trash-2-CQFvCnC6.js";import"./templates-B6M1OYb3.js";import"./plus-BJTeDAB9.js";import"./task-row-DyAwey7s.js";import"./i18n-labels-BbGrq0DR.js";import"./selectable-icon-Bpd4_Ocv.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-DPJgjGVq.js";import"./arrow-left-Rrt-QzPz.js";var s,c,p,l,d,m,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ya={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
