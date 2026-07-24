import{aU as n,av as R}from"./iframe-DeS90g67.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-DFlih1MO.js";import{P as H}from"./project-modal-CPa9Hr20.js";import"./preload-helper-Dp1pzeXC.js";import"./index-BmFqsrM6.js";import"./Select-ef7c0426.esm-BFYwGsfY.js";import"./chevron-down-BZ1Ldqbe.js";import"./check-DJ0G5eFa.js";import"./index-BGUUeRco.js";import"./triangle-alert-C362zCt_.js";import"./export-menu-Bu65tMeW.js";import"./client-BDBq9aix.js";import"./markdown-preview-ZSPz5QVn.js";import"./index.dom-D_wTd2ti.js";import"./file-text-DzLYtIB2.js";import"./copy-CVHZEbJR.js";import"./file-code-corner-DMVg0msj.js";import"./loader-circle-DFTk9Vu-.js";import"./api-B4aCgmkc.js";import"./folder-open-BgMpl7vq.js";import"./folder-CD6-LATG.js";import"./tag-color-picker-DgkWC3Cc.js";import"./project-tag-CIs1N8lT.js";import"./sparkles-B9--cHLQ.js";import"./brain-27cpyi5G.js";import"./chevron-right-DuSEJUJI.js";import"./markdown-editor-CpKfWiO2.js";import"./pencil-Cnc-6O9n.js";import"./trash-2-Cm2pgQr8.js";import"./templates-B6M1OYb3.js";import"./plus-TV7VNk08.js";import"./task-row-C_HzR8C5.js";import"./i18n-labels-CSp_SUAc.js";import"./selectable-icon-BARBaMDg.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-C5Dm2ocv.js";import"./arrow-left-B7wxA2bD.js";var s,c,p,l,d,m,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ya={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
