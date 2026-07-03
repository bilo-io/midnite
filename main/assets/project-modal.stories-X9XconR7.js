import{n as s,T as R}from"./iframe-Cz1STkNn.js";import{c as N,q as B,k as x,p as j}from"./fixtures-CckvYj1j.js";import{C as P}from"./confirm-dialog-r8fDvl83.js";import{P as H}from"./project-modal-qql9jMKV.js";import"./preload-helper-Dp1pzeXC.js";import"./index-D9Bb3jTe.js";import"./Select-ef7c0426.esm-BTnMkm5U.js";import"./check-B66MxYDM.js";import"./triangle-alert-BUc5o9GK.js";import"./export-menu-D9_6mC-Q.js";import"./client-LJnBqKxZ.js";import"./markdown-preview-C4XVxiHS.js";import"./index.dom-D_wTd2ti.js";import"./file-text-C7mfxTbu.js";import"./copy-28jSnAEL.js";import"./file-code-corner-DGDUKg7r.js";import"./loader-circle-DKzzsIWr.js";import"./api-QR_eMQtt.js";import"./inbound-DCvJZueD.js";import"./folder-open-BY9dKaLS.js";import"./folder-BsDhbojL.js";import"./project-tag-a9m3f9RM.js";import"./tag-color-picker-Cs4iySpu.js";import"./source-list-editor-DSkRB5F4.js";import"./core.esm-VbRt9FX-.js";import"./source-icon-DOWxNzZ1.js";import"./globe-DcCoQmrX.js";import"./sticky-note-Td71Kkqx.js";import"./plus-Dlkm-EcS.js";import"./external-link-EvduyE18.js";import"./task-row-1fLw1Ljy.js";import"./blocked-badge-DPiDulQh.js";import"./selectable-icon-Cz1q0n8A.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-CY-9yex2.js";import"./pencil-2OIMvSv7.js";import"./trash-2-CsTbYyEb.js";import"./refresh-cw-DwDQTm9y.js";import"./index-5T0W_wR2.js";import"./lightbulb-DyMycNf-.js";import"./templates-B6M1OYb3.js";import"./sparkles-BGlp023H.js";import"./brain-QNLqhldL.js";import"./chevron-right-CNJ-ILJS.js";var n,c,p,m,d,l,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:a}=__STORYBOOK_MODULE_TEST__,ft={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[t=>s.jsx(R,{children:s.jsx(P,{children:s.jsx(t,{})})})]},o={args:{project:null},play:async({canvasElement:t})=>{const e=await a(t).findByRole("dialog",{name:"New project"});await f(a(e).getByLabelText("Title")).toHaveValue("")}},r={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:t})=>{const e=await a(t).findByRole("dialog",{name:"Edit project"});await f(a(e).getByLabelText("Title")).toHaveValue(j.name)}},i={args:{project:j,tasks:[B,x]},play:async({canvasElement:t})=>{const e=await a(t).findByRole("dialog",{name:"Edit project"}),k=a(e).getByRole("tab",{name:/sources/i});await C.click(k),await f(k).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(n=o.parameters)===null||n===void 0?void 0:n.docs,source:{originalSource:`{
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
