import{n as s,T as R}from"./iframe-Dz_DtqUo.js";import{c as N,q as B,k as x,p as j}from"./fixtures-CckvYj1j.js";import{a as P}from"./confirm-dialog-C_mqEoFs.js";import{P as H}from"./project-modal-UzSsUN67.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-g0iEX4IJ.js";import"./index-D9G6S2GC.js";import"./check-C5PTA9v1.js";import"./triangle-alert-CjkTARTl.js";import"./export-menu-C8N_QvP8.js";import"./client-Dp6U06rs.js";import"./markdown-preview-5O9zbh5e.js";import"./file-text-D5t8H4dT.js";import"./copy-tl_W4F2d.js";import"./loader-circle-CAvnM_Yk.js";import"./api-A95bhGP6.js";import"./inbound-CbJZzwyX.js";import"./folder-open-BoN4j_Jm.js";import"./folder-CTSZcZW1.js";import"./project-tag-Ciwv7y0h.js";import"./tag-color-picker-CMYgyfaE.js";import"./source-list-editor-DF4byt9-.js";import"./source-icon-DprTp1uE.js";import"./globe-BAe6TdlK.js";import"./sticky-note-C3GL4_ki.js";import"./plus-hMI-Gdtf.js";import"./external-link-NIeTHJj8.js";import"./task-row-DULxP7pg.js";import"./blocked-badge-BPdkeDt5.js";import"./selectable-icon-Dm7cqDmH.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-F3yNzRNa.js";import"./pencil-DJWXXaoM.js";import"./trash-2-Jj66FQdG.js";import"./refresh-cw-CWh3-TFx.js";import"./index-CkL35fn8.js";import"./lightbulb-VyN61Xn-.js";import"./templates-B6M1OYb3.js";import"./sparkles-4K9G5vul.js";import"./brain-V8oMhZ-h.js";import"./chevron-right-CncYfjLn.js";var n,c,p,m,d,l,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:L,within:t}=__STORYBOOK_MODULE_TEST__,ba={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>s.jsx(R,{children:s.jsx(P,{children:s.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},r={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},i={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),k=t(e).getByRole("tab",{name:/sources/i});await L.click(k),await f(k).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(n=o.parameters)===null||n===void 0?void 0:n.docs,source:{originalSource:`{
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
