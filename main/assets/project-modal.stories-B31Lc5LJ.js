import{n as s,T as R}from"./iframe-ittfSASu.js";import{c as N,q as B,k as x,p as j}from"./fixtures-CckvYj1j.js";import{C as P}from"./confirm-dialog-CQpcAWtJ.js";import{P as H}from"./project-modal-iPw1OeGt.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DGcqDc3J.js";import"./Select-ef7c0426.esm-AI1R9juX.js";import"./check-C_ajYtuI.js";import"./triangle-alert-Z7CtWAfs.js";import"./export-menu-ZegaGtr6.js";import"./client-DWSAWPAE.js";import"./markdown-preview-Dt3hQkiT.js";import"./index.dom-D_wTd2ti.js";import"./file-text-fh1ED7Tg.js";import"./copy-DNYFv7H_.js";import"./file-code-corner-gQ4N7L22.js";import"./loader-circle-BbT0i4MP.js";import"./api-DwMnPyiF.js";import"./inbound-Cpdtk9h4.js";import"./folder-open-C9nP3to_.js";import"./folder-BGoaqglz.js";import"./project-tag-BfBumwR9.js";import"./tag-color-picker-CKekx2L6.js";import"./source-list-editor-CioqssvP.js";import"./core.esm-CskbOMYP.js";import"./source-icon-Cc3oK9uu.js";import"./globe-t5sSyGA4.js";import"./sticky-note-Bh4pQvY7.js";import"./plus-COf8PEIL.js";import"./external-link-voaMXyB0.js";import"./task-row-CceCQ-YN.js";import"./blocked-badge-DXuvp8FP.js";import"./selectable-icon-CLbJY_9V.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-Bip698Ba.js";import"./pencil-CzjSXTrc.js";import"./trash-2-CiMszRqP.js";import"./refresh-cw-DCMzB1CZ.js";import"./index-uvySoyHO.js";import"./lightbulb-BehC4PYw.js";import"./templates-B6M1OYb3.js";import"./sparkles-DExnO58X.js";import"./brain-CQZ34dI1.js";import"./chevron-right-gl5sSsgv.js";var n,c,p,m,d,l,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:a}=__STORYBOOK_MODULE_TEST__,ft={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[t=>s.jsx(R,{children:s.jsx(P,{children:s.jsx(t,{})})})]},o={args:{project:null},play:async({canvasElement:t})=>{const e=await a(t).findByRole("dialog",{name:"New project"});await f(a(e).getByLabelText("Title")).toHaveValue("")}},r={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:t})=>{const e=await a(t).findByRole("dialog",{name:"Edit project"});await f(a(e).getByLabelText("Title")).toHaveValue(j.name)}},i={args:{project:j,tasks:[B,x]},play:async({canvasElement:t})=>{const e=await a(t).findByRole("dialog",{name:"Edit project"}),k=a(e).getByRole("tab",{name:/sources/i});await C.click(k),await f(k).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(n=o.parameters)===null||n===void 0?void 0:n.docs,source:{originalSource:`{
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
}`,...(T=i.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Sources marks that tab selected.",...(b=i.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const St=["New","Edit","SwitchTab"];export{r as Edit,o as New,i as SwitchTab,St as __namedExportsOrder,ft as default};
