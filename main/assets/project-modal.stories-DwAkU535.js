import{n as s,T as R}from"./iframe-Bv7TZnSa.js";import{c as N,q as B,k as x,p as j}from"./fixtures-CckvYj1j.js";import{a as P}from"./confirm-dialog-BnlEy2uN.js";import{P as H}from"./project-modal-DZIQcSb0.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-Cax_LvG-.js";import"./index-DK-uwmrl.js";import"./check-kIS44PmB.js";import"./triangle-alert-LbbgvIjV.js";import"./export-menu-Bc4pvCSv.js";import"./client-Bnps9XAE.js";import"./markdown-preview-D7XjNTTW.js";import"./file-text-DBRj1Ga1.js";import"./copy-DepjiCSH.js";import"./loader-circle-Dq2O1Zuc.js";import"./api-CHjHKUbu.js";import"./webhook-Cky58oAp.js";import"./folder-open-D9qhVium.js";import"./folder-DNJVyYKX.js";import"./project-tag-DbYQwDsH.js";import"./tag-color-picker-BLf_Xvx1.js";import"./source-list-editor-NG4N9YkK.js";import"./source-icon-B-zDdrzJ.js";import"./globe-BPk9sCnr.js";import"./sticky-note-B9op07TP.js";import"./plus-DRBdmDVr.js";import"./external-link-DEmcJW3p.js";import"./task-row-DxrjOzfM.js";import"./blocked-badge-GNFLfOBG.js";import"./selectable-icon-CSwZYAT7.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-AV8yoCAf.js";import"./pencil-C4XyZO6A.js";import"./trash-2-DC2dNlho.js";import"./refresh-cw-JlfTAf8w.js";import"./index-8Wb0CsfS.js";import"./lightbulb-SdYyfo2i.js";import"./templates-B6M1OYb3.js";import"./sparkles-DPRSCIyE.js";import"./brain-CAcasuPS.js";import"./chevron-right-CT381ACL.js";var n,c,p,m,d,l,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:L,within:t}=__STORYBOOK_MODULE_TEST__,ba={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>s.jsx(R,{children:s.jsx(P,{children:s.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},r={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},i={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),k=t(e).getByRole("tab",{name:/sources/i});await L.click(k),await f(k).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(n=o.parameters)===null||n===void 0?void 0:n.docs,source:{originalSource:`{
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
