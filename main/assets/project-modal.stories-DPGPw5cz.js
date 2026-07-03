import{n as s,T as R}from"./iframe-D56zeehm.js";import{c as N,q as B,k as x,p as j}from"./fixtures-CckvYj1j.js";import{C as P}from"./confirm-dialog-CRGtfqWP.js";import{P as H}from"./project-modal-DpzA1i5I.js";import"./preload-helper-Dp1pzeXC.js";import"./index-uldj7XQ-.js";import"./Select-ef7c0426.esm-CMcnt6So.js";import"./check-DrTJmGpT.js";import"./triangle-alert-CnoAWDu3.js";import"./export-menu-CtTKPm44.js";import"./client-g-qyXJeb.js";import"./markdown-preview-CGuJq_q_.js";import"./index.dom-D_wTd2ti.js";import"./file-text-B-MD8U7S.js";import"./copy-CyJM959c.js";import"./file-code-corner-Bw9qWUWa.js";import"./loader-circle-BIiUOGy3.js";import"./api-Cm_UA91W.js";import"./inbound-DG44u6YS.js";import"./folder-open-BD7wa6Ve.js";import"./folder-B2S26Tku.js";import"./project-tag-XT8NYgUq.js";import"./tag-color-picker-CUK0mg5H.js";import"./source-list-editor-ku2n0dVl.js";import"./core.esm-BrtpOJFx.js";import"./source-icon-C8ZtQMJF.js";import"./globe-Ul3oDyEG.js";import"./sticky-note-7bUvdLHT.js";import"./plus-DKqgbHXr.js";import"./external-link-DGS_OYMm.js";import"./task-row-B2kDHMet.js";import"./blocked-badge-C8Esupm1.js";import"./selectable-icon-CD30N84j.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-UaNwyjDO.js";import"./pencil-WO7xN4WF.js";import"./trash-2-CX2Zyz8u.js";import"./refresh-cw-DtPORVOj.js";import"./index-Csmsyqqs.js";import"./lightbulb-CqGSGuuW.js";import"./templates-B6M1OYb3.js";import"./sparkles-BEfbpLyC.js";import"./brain-C7DOKbQH.js";import"./chevron-right-D0TnVbRT.js";var n,c,p,m,d,l,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:a}=__STORYBOOK_MODULE_TEST__,ft={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[t=>s.jsx(R,{children:s.jsx(P,{children:s.jsx(t,{})})})]},o={args:{project:null},play:async({canvasElement:t})=>{const e=await a(t).findByRole("dialog",{name:"New project"});await f(a(e).getByLabelText("Title")).toHaveValue("")}},r={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:t})=>{const e=await a(t).findByRole("dialog",{name:"Edit project"});await f(a(e).getByLabelText("Title")).toHaveValue(j.name)}},i={args:{project:j,tasks:[B,x]},play:async({canvasElement:t})=>{const e=await a(t).findByRole("dialog",{name:"Edit project"}),k=a(e).getByRole("tab",{name:/sources/i});await C.click(k),await f(k).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(n=o.parameters)===null||n===void 0?void 0:n.docs,source:{originalSource:`{
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
