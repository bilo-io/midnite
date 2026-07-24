import{aU as n,av as R}from"./iframe-DEiWDkYx.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-otkATFfq.js";import{P as H}from"./project-modal-Cvq8TotJ.js";import"./preload-helper-Dp1pzeXC.js";import"./index-_jGqRVQb.js";import"./Select-ef7c0426.esm-DaSrsoCS.js";import"./chevron-down-BESpXNuf.js";import"./check-u22-M-Oh.js";import"./index-Clm5FfWQ.js";import"./triangle-alert-DP3-beFX.js";import"./export-menu-DrF4_zFC.js";import"./client-2UTqC7J6.js";import"./markdown-preview-Cl8U4f8z.js";import"./index.dom-D_wTd2ti.js";import"./file-text-D76kGz1D.js";import"./copy-CMcG4qZN.js";import"./file-code-corner-BnkCFIms.js";import"./loader-circle-CkVCXTHI.js";import"./api-B48H8P2O.js";import"./folder-open-BlVHYhye.js";import"./folder-CNj9gZEi.js";import"./tag-color-picker-CP-OWk6l.js";import"./project-tag-3JAXHW0l.js";import"./sparkles-C3l59qbn.js";import"./brain-DkGHAz1x.js";import"./chevron-right-D_Qefsjl.js";import"./markdown-editor-BJc_rxtE.js";import"./pencil-BXHKMJYg.js";import"./trash-2-D3oQHikl.js";import"./templates-B6M1OYb3.js";import"./plus-DZXpCxGX.js";import"./task-row-BD3d4KIC.js";import"./i18n-labels-BG71H2El.js";import"./selectable-icon-DBWtwc1g.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-CGmPwJQx.js";import"./arrow-left-RZMrx_kI.js";var s,c,p,l,d,m,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ya={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
