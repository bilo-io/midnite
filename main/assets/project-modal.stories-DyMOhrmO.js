import{n as s,T as R}from"./iframe-CNz5KHij.js";import{c as N,q as B,k as x,p as j}from"./fixtures-CckvYj1j.js";import{a as P}from"./confirm-dialog-DW6tBEaz.js";import{P as H}from"./project-modal-CYMgdWYT.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-VwhzwvIV.js";import"./index-C5ghNh63.js";import"./check-CMw8VXVG.js";import"./triangle-alert-DrSezbxE.js";import"./export-menu-BVwNh1ml.js";import"./client-Br3di9Re.js";import"./markdown-preview-Dg5-UkQR.js";import"./index.dom-D_wTd2ti.js";import"./file-text-Bfd1Ueji.js";import"./copy-B-o4ltN_.js";import"./file-code-corner-DRSAMa2n.js";import"./loader-circle-4-ZMQwAZ.js";import"./api-4WxRUCnO.js";import"./inbound-B8us280C.js";import"./folder-open-NUIN3LTM.js";import"./folder-sFtgy4XR.js";import"./project-tag-W12TBdYX.js";import"./tag-color-picker-BNw2qHbY.js";import"./source-list-editor-Dns1Gs8o.js";import"./source-icon-6XfC2D7b.js";import"./globe-DOsZr90C.js";import"./sticky-note-BENAZJ7r.js";import"./plus-bh9bwRJx.js";import"./external-link-DCaNVTZD.js";import"./task-row-DvSnrUVY.js";import"./blocked-badge-higZ6yAO.js";import"./selectable-icon-0awCizS4.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-omCme6r9.js";import"./pencil-BEWBvq_a.js";import"./trash-2-Cc4QIG46.js";import"./refresh-cw-D9jroR6t.js";import"./index-BMMtNKka.js";import"./lightbulb-BTZI3Wi1.js";import"./templates-B6M1OYb3.js";import"./sparkles-C8Dy7e6o.js";import"./brain-Btj25chb.js";import"./chevron-right-DMvDn6MR.js";var n,c,p,m,d,l,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:L,within:t}=__STORYBOOK_MODULE_TEST__,ha={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>s.jsx(R,{children:s.jsx(P,{children:s.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},r={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},i={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),k=t(e).getByRole("tab",{name:/sources/i});await L.click(k),await f(k).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(n=o.parameters)===null||n===void 0?void 0:n.docs,source:{originalSource:`{
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
}`,...(T=i.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Sources marks that tab selected.",...(b=i.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const fa=["New","Edit","SwitchTab"];export{r as Edit,o as New,i as SwitchTab,fa as __namedExportsOrder,ha as default};
