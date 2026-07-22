import{aX as n,ax as R}from"./iframe-DlvE0Ums.js";import{c as N,q as x,k as B,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-DDdtf2Gb.js";import{P as H}from"./project-modal-DeuZeQPX.js";import"./preload-helper-Dp1pzeXC.js";import"./index-CXzVbIdp.js";import"./Select-ef7c0426.esm-DNTc6VZb.js";import"./chevron-down-CdAptX9c.js";import"./check-CY1ihSMq.js";import"./index-rMSsiRW_.js";import"./triangle-alert-idUdc9pK.js";import"./export-menu-DF4cBUer.js";import"./client-BU4NSCUe.js";import"./markdown-preview-loinpjKg.js";import"./index.dom-D_wTd2ti.js";import"./file-text-D52JwkGT.js";import"./copy-Cx8vAPo6.js";import"./file-code-corner-BNAMeOq5.js";import"./loader-circle-B_Tb7KNP.js";import"./api-DlXZggbX.js";import"./folder-open-KHbG2ifg.js";import"./folder-CpPliGBx.js";import"./tag-color-picker-DN8kEyVs.js";import"./project-tag-Cq7bbMgm.js";import"./sparkles-CTuiah7C.js";import"./brain-DL35hs6Y.js";import"./chevron-right-EExR8NuN.js";import"./markdown-editor-CEJgWNBK.js";import"./pencil-Cd54G_lS.js";import"./trash-2-C0KbFVts.js";import"./templates-B6M1OYb3.js";import"./plus-Cv86bxOt.js";import"./task-row-Dy9Jia66.js";import"./blocked-badge-DTmVh6Nn.js";import"./selectable-icon-BNO-YTSo.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-CTJoTJBx.js";import"./arrow-left-BGcEfcc9.js";var s,c,p,l,d,m,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ya={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[x,B],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[x,B]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
