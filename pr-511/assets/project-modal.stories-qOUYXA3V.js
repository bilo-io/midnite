import{l as n,T as R}from"./iframe-Cg2o_Bk-.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-Di0qRtPT.js";import{P as H}from"./project-modal-B4178Os2.js";import"./preload-helper-Dp1pzeXC.js";import"./index-Bw-__ywM.js";import"./index-CbYVl3vK.js";import"./Select-ef7c0426.esm-BlqT6X20.js";import"./chevron-down-3i-4yyLW.js";import"./check-CKIAQW2Y.js";import"./triangle-alert-DgzQ2CjE.js";import"./export-menu-67f6J86c.js";import"./client-CvmEeLGy.js";import"./markdown-preview-CSJgyjZY.js";import"./index.dom-D_wTd2ti.js";import"./file-text-BpA8qNpb.js";import"./copy-C4xCETH5.js";import"./file-code-corner-_e7vfKHt.js";import"./loader-circle-CvljujOb.js";import"./api-CJSY_K2f.js";import"./site-links-BhZk_F72.js";import"./folder-open-BK6Kvm5z.js";import"./folder-B7A1myN_.js";import"./tag-color-picker-Dww-Mcpx.js";import"./project-tag-C79VjqWu.js";import"./sparkles-zNWOS-pY.js";import"./brain-BbmngoGp.js";import"./chevron-right-CJKK8M78.js";import"./markdown-editor-BRV3VD_M.js";import"./pencil-Cde1HOwV.js";import"./trash-2-C38F6-sq.js";import"./templates-B6M1OYb3.js";import"./plus-07WdCAvi.js";import"./task-row-c39ZUFY8.js";import"./blocked-badge-By_50ja3.js";import"./selectable-icon-pMkpMezb.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-DL5J-424.js";import"./arrow-left-DRhuQn9L.js";var s,c,p,l,d,m,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,Ta={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const Ea=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,Ea as __namedExportsOrder,Ta as default};
