import{n as s,T as R}from"./iframe-DvVe4A6D.js";import{c as N,q as B,k as x,p as j}from"./fixtures-CckvYj1j.js";import{a as P}from"./confirm-dialog-BkP8IIlU.js";import{P as H}from"./project-modal-CsvegGiw.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-DcF5KZ0m.js";import"./index-CCMh9Dwi.js";import"./check-CPIh5aCr.js";import"./triangle-alert-DtEMlhrV.js";import"./export-menu-BI4zFvX8.js";import"./client-PJSD-E3G.js";import"./markdown-preview-BWhUy1YW.js";import"./file-text-2HbuFbp6.js";import"./copy-sFWw8rAK.js";import"./loader-circle-DNvF26xo.js";import"./api-4WxRUCnO.js";import"./inbound-B8us280C.js";import"./folder-open-CH5a5Csl.js";import"./folder-B1v2FtH3.js";import"./project-tag-yS2_mW4n.js";import"./tag-color-picker-2R9C46P3.js";import"./source-list-editor-Jzyh-0JI.js";import"./source-icon-BLhdWnc4.js";import"./globe-DAP0lkLV.js";import"./sticky-note-DSbL4tcf.js";import"./plus-CKd2C8nA.js";import"./external-link-gJEzfnbl.js";import"./task-row-3_iyza26.js";import"./blocked-badge-B8ncLfyq.js";import"./selectable-icon-Dtdb2U9L.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-MmjvQgJc.js";import"./pencil-CylB1yAg.js";import"./trash-2-CpvDsJOH.js";import"./refresh-cw-DRr-gChu.js";import"./index-D_LlzobA.js";import"./lightbulb-CP7QL4m9.js";import"./templates-B6M1OYb3.js";import"./sparkles-KM1eS_DT.js";import"./brain-C7xXulVP.js";import"./chevron-right-Ckd86IAm.js";var n,c,p,m,d,l,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:L,within:t}=__STORYBOOK_MODULE_TEST__,ba={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>s.jsx(R,{children:s.jsx(P,{children:s.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},r={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},i={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),k=t(e).getByRole("tab",{name:/sources/i});await L.click(k),await f(k).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(n=o.parameters)===null||n===void 0?void 0:n.docs,source:{originalSource:`{
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
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(d=o.parameters)===null||d===void 0||(m=d.docs)===null||m===void 0?void 0:m.description}}};r.parameters={...r.parameters,docs:{...(l=r.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
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
}`,...(u=r.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.source},description:{story:"Editing a project — fields pre-filled, with tasks + a scoped memory surfaced.",...(w=r.parameters)===null||w===void 0||(_=w.docs)===null||_===void 0?void 0:_.description}}};i.parameters={...i.parameters,docs:{...(g=i.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
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
    const sourcesTab = within(dialog).getByRole('tab', {
      name: /sources/i
    });
    await userEvent.click(sourcesTab);
    await expect(sourcesTab).toHaveAttribute('aria-selected', 'true');
  }
}`,...(T=i.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Sources marks that tab selected.",...(b=i.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const ja=["New","Edit","SwitchTab"];export{r as Edit,o as New,i as SwitchTab,ja as __namedExportsOrder,ba as default};
