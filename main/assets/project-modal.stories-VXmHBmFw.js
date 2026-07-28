import{a$ as n,aC as R}from"./iframe-B_UrzKrD.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-DElwzLT2.js";import{P as C}from"./project-modal-CijcpNhp.js";import"./preload-helper-Dp1pzeXC.js";import"./index-VbBfGO4L.js";import"./Select-ef7c0426.esm-BX4WwO4i.js";import"./chevron-down-DqoRYXAu.js";import"./check-DF5SlEbQ.js";import"./index-CmmoSlDM.js";import"./triangle-alert-CHuqe3ea.js";import"./export-menu-CdqdLgNB.js";import"./client-CaWNbc52.js";import"./markdown-preview-9LxSQ6w0.js";import"./index.dom-D_wTd2ti.js";import"./file-text-YZxrPVli.js";import"./copy-Ci6StAH3.js";import"./file-code-corner-CXceAAsU.js";import"./loader-circle-DZ_F7Scl.js";import"./api-BbDUgoAE.js";import"./folder-open-4_FXI-H4.js";import"./folder-uia7KqCO.js";import"./tag-color-picker-BNHWpBvW.js";import"./project-tag-BJRRV0pi.js";import"./sparkles-BJS9ax8Z.js";import"./brain-DnciGFFq.js";import"./chevron-right-D4ybW5Ha.js";import"./markdown-editor-DLkVgpjh.js";import"./pencil-D58C1bck.js";import"./trash-2-CvdDMksf.js";import"./templates-Oea5ZCNz.js";import"./plus-Bgy2XQbo.js";import"./task-row-B0a8Vb4W.js";import"./i18n-labels-BF_LOdU7.js";import"./selectable-icon-D7m9aJ7v.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-CGOfEc7G.js";import"./arrow-left-BEspiRUq.js";var s,c,p,l,d,m,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:H,within:t}=__STORYBOOK_MODULE_TEST__,ya={title:"Components/ProjectModal",component:C,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await H.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
