import{aX as n,ax as R}from"./iframe-CDgWhdIn.js";import{c as N,q as x,k as B,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-Dx5PX-QO.js";import{P as H}from"./project-modal-45_hfnzz.js";import"./preload-helper-Dp1pzeXC.js";import"./index-Cwv7p9ry.js";import"./Select-ef7c0426.esm-z278qjOb.js";import"./chevron-down-DPHDlNrV.js";import"./check-cDbXTsaj.js";import"./index-CIP-Cxso.js";import"./triangle-alert-CikdIANg.js";import"./export-menu-DRWR9nHJ.js";import"./client-OlmHVPsp.js";import"./markdown-preview-bluxDXCS.js";import"./index.dom-D_wTd2ti.js";import"./file-text-Bhun4Tdc.js";import"./copy-vBCkWfGW.js";import"./file-code-corner-CrcDBh-X.js";import"./loader-circle-73gh_eLG.js";import"./api-Di6Yr4tf.js";import"./folder-open-U-2SRlg1.js";import"./folder-CejYjCtt.js";import"./tag-color-picker-BhmNsbRO.js";import"./project-tag-DtF8iDN7.js";import"./sparkles-CSNjDRuY.js";import"./brain-BZCSxDUP.js";import"./chevron-right-zWTBXpDU.js";import"./markdown-editor-D7_HVh4u.js";import"./pencil-DDNtlYnK.js";import"./trash-2-Mj_-WYIV.js";import"./templates-B6M1OYb3.js";import"./plus-DHHBpvvY.js";import"./task-row-DJW7LG53.js";import"./blocked-badge-CfFOI2cL.js";import"./selectable-icon-98aaW5Pj.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-BLEMURmR.js";import"./arrow-left-BhRFwDMM.js";var s,c,p,l,d,m,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ya={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[x,B],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[x,B]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
