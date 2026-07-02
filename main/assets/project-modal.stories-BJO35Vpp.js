import{n as s,T as R}from"./iframe-CKCsQZq4.js";import{c as N,q as B,k as x,p as j}from"./fixtures-CckvYj1j.js";import{C as P}from"./confirm-dialog-CGI2BbjV.js";import{P as H}from"./project-modal-rZ5K1C-c.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DIP-HEAf.js";import"./Select-ef7c0426.esm-BX5wH4at.js";import"./check-BLYlGxxf.js";import"./triangle-alert-BatrypGD.js";import"./export-menu-CL5HG1Lm.js";import"./client-DpvLNtYL.js";import"./markdown-preview-Cnj895-W.js";import"./index.dom-D_wTd2ti.js";import"./file-text-Ce0_Y08J.js";import"./copy-Bs0sLm_g.js";import"./file-code-corner-CHMHlZyd.js";import"./loader-circle-D_mzYpSO.js";import"./api-x3f2lr37.js";import"./inbound-CBNilj0T.js";import"./folder-open-BMZkhJX0.js";import"./folder-tldTUXz8.js";import"./project-tag-D-_KDpwi.js";import"./tag-color-picker-ToOYsJFV.js";import"./source-list-editor-kMUfslCv.js";import"./core.esm-B8SQ-QC2.js";import"./source-icon-9ijlaZ_U.js";import"./globe-DLCeiwO5.js";import"./sticky-note-5G8T4OSs.js";import"./plus-DqFrD4UD.js";import"./external-link-9mvHZbEQ.js";import"./task-row-BslIW2vI.js";import"./blocked-badge-D_HDs9Ll.js";import"./selectable-icon-DRDMrhio.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-QmD5Xfvh.js";import"./pencil-D_1Ai7XC.js";import"./trash-2-CGJNYFde.js";import"./refresh-cw-EkBJnrz1.js";import"./index-Bd0wpSKm.js";import"./lightbulb-XVCo72aj.js";import"./templates-B6M1OYb3.js";import"./sparkles-BgtLYWwz.js";import"./brain-DkyAIVzd.js";import"./chevron-right-D6ZOw0H7.js";var n,c,p,m,d,l,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:a}=__STORYBOOK_MODULE_TEST__,ft={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[t=>s.jsx(R,{children:s.jsx(P,{children:s.jsx(t,{})})})]},o={args:{project:null},play:async({canvasElement:t})=>{const e=await a(t).findByRole("dialog",{name:"New project"});await f(a(e).getByLabelText("Title")).toHaveValue("")}},r={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:t})=>{const e=await a(t).findByRole("dialog",{name:"Edit project"});await f(a(e).getByLabelText("Title")).toHaveValue(j.name)}},i={args:{project:j,tasks:[B,x]},play:async({canvasElement:t})=>{const e=await a(t).findByRole("dialog",{name:"Edit project"}),k=a(e).getByRole("tab",{name:/sources/i});await C.click(k),await f(k).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(n=o.parameters)===null||n===void 0?void 0:n.docs,source:{originalSource:`{
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
