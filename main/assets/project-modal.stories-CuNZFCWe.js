import{a$ as n,aw as R}from"./iframe-Df9-NFzZ.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-Ds4D0dW8.js";import{P as H}from"./project-modal-CaG7xoKG.js";import"./preload-helper-Dp1pzeXC.js";import"./index-Velv4tbD.js";import"./Select-ef7c0426.esm-LOz6FoKL.js";import"./chevron-down-DrPiuqdT.js";import"./check-lyzHGyuG.js";import"./export-menu-CrI3FaMB.js";import"./client-CV_we8aY.js";import"./markdown-preview-Cf0LD5Cf.js";import"./index.dom-D_wTd2ti.js";import"./copy-B9-xGFq5.js";import"./file-code-corner-CYDwrkP0.js";import"./file-text-BzQxQ1iZ.js";import"./loader-circle-8yWU-yvU.js";import"./api-BSIQq3of.js";import"./folder-open-RN3AgE1t.js";import"./folder-CZrJqyaE.js";import"./tag-color-picker-BH-a6IUW.js";import"./project-tag-j2ReiEyi.js";import"./sparkles-BXgOw8Qn.js";import"./brain-DCOM-RYp.js";import"./chevron-right-Drst9JJ9.js";import"./markdown-editor-C6Cr2qAA.js";import"./pencil-B3TTArpU.js";import"./trash-2-DDjmKNdf.js";import"./templates-6Bzalm-K.js";import"./project-template-labels-CxHK9bj5.js";import"./plus-CEGIl1kf.js";import"./task-row-BHfyyDNl.js";import"./blocked-badge-Hu1vMoch.js";import"./selectable-icon-C3bAZ5zM.js";import"./hover-expand-button-CXNKikvF.js";import"./index-DBT0LLZB.js";import"./data-refresh-B7q3cUAO.js";import"./rotate-ccw-CxVdpw4B.js";import"./play-C5uKIz-E.js";import"./square-terminal-D1oCHV6G.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-BkXIuWGX.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(m=o.parameters)===null||m===void 0||(l=m.docs)===null||l===void 0?void 0:l.description}}};i.parameters={...i.parameters,docs:{...(d=i.parameters)===null||d===void 0?void 0:d.docs,source:{originalSource:`{
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
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const ha=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,ha as __namedExportsOrder,ja as default};
