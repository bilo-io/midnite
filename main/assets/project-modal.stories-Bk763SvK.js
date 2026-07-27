import{a$ as n,aC as R}from"./iframe-vNFTz3Ts.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-DqKom3Jq.js";import{P as C}from"./project-modal-DFC4izNW.js";import"./preload-helper-Dp1pzeXC.js";import"./index-BGzBdSBo.js";import"./Select-ef7c0426.esm-C-1ti25q.js";import"./chevron-down-l40ewNnw.js";import"./check-ssWnZQZq.js";import"./index-CnAnYl_g.js";import"./triangle-alert-B76Hgw5C.js";import"./export-menu-HH54aPb6.js";import"./client-Z9pmxE4J.js";import"./markdown-preview-yFN4uTpF.js";import"./index.dom-D_wTd2ti.js";import"./file-text-BdjZnLJX.js";import"./copy-BtjaetB-.js";import"./file-code-corner-BE0Me1j9.js";import"./loader-circle-CSGeX8eS.js";import"./api-DHLG7IHV.js";import"./folder-open-DaMT-Nxu.js";import"./folder-BdCPmglS.js";import"./tag-color-picker-C7odc8R9.js";import"./project-tag-BA3umkeD.js";import"./sparkles-C7kk7rLh.js";import"./brain-cLNyRbvW.js";import"./chevron-right-CSjajS4J.js";import"./markdown-editor-SUXAduKI.js";import"./pencil-CGbWz8OE.js";import"./trash-2-JmBnsNS1.js";import"./templates-CYfMbSGV.js";import"./plus-CKygJzCX.js";import"./task-row-GCHkc_eu.js";import"./i18n-labels-DT1lWD5c.js";import"./selectable-icon-DzjWK2hx.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-BZPa-br0.js";import"./arrow-left-D8vYkSwT.js";var s,c,p,l,d,m,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:H,within:t}=__STORYBOOK_MODULE_TEST__,ya={title:"Components/ProjectModal",component:C,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await H.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
