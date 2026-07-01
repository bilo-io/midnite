import{n as s,T as R}from"./iframe-kXbbvWEw.js";import{c as N,q as B,k as x,p as j}from"./fixtures-CckvYj1j.js";import{a as P}from"./confirm-dialog-CCsTUoMI.js";import{P as H}from"./project-modal-B3_UkYlz.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-Cp5mvDU9.js";import"./index-ByjA7Gfy.js";import"./check-BeSN7jXR.js";import"./triangle-alert-Ciuh50R7.js";import"./export-menu-9g9TgYUB.js";import"./client-CTlpozoZ.js";import"./markdown-preview-CFVDudB0.js";import"./file-text-CwswAI9a.js";import"./copy-DNl2-pzX.js";import"./loader-circle-CuvK1-M5.js";import"./api-A95bhGP6.js";import"./inbound-CbJZzwyX.js";import"./folder-open--MOtCSk2.js";import"./folder-r62TjS2L.js";import"./project-tag-D_D8f0Ix.js";import"./tag-color-picker-ClwdW2AH.js";import"./source-list-editor-D5h9YQ6m.js";import"./source-icon-DYoALhQR.js";import"./globe-D3O_2oZt.js";import"./sticky-note-BlGTHavg.js";import"./plus-BBchGkTx.js";import"./external-link-CwC4lBmY.js";import"./task-row-lQtiPlLE.js";import"./blocked-badge-B97D6LAI.js";import"./selectable-icon-DQ-soRVm.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-3h5aBcwd.js";import"./pencil-3yPt6yiI.js";import"./trash-2-L7eRk-xJ.js";import"./refresh-cw-DUANRlQy.js";import"./index-Bny_P3eP.js";import"./lightbulb-Cf-pIRW-.js";import"./templates-B6M1OYb3.js";import"./sparkles-CUNANSBe.js";import"./brain-CblZ24jn.js";import"./chevron-right-E2O7QEXU.js";var n,c,p,m,d,l,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:L,within:t}=__STORYBOOK_MODULE_TEST__,ba={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>s.jsx(R,{children:s.jsx(P,{children:s.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},r={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},i={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),k=t(e).getByRole("tab",{name:/sources/i});await L.click(k),await f(k).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(n=o.parameters)===null||n===void 0?void 0:n.docs,source:{originalSource:`{
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
