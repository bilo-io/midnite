import{aU as n,av as R}from"./iframe-5pFo-QFi.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-DHQUnjr6.js";import{P as H}from"./project-modal-CE4eHxcG.js";import"./preload-helper-Dp1pzeXC.js";import"./index-RkB9uvtH.js";import"./Select-ef7c0426.esm-XiJhJnso.js";import"./chevron-down-BNqt42Xp.js";import"./check-kpV5Siab.js";import"./index-Do5bW6oL.js";import"./triangle-alert-OfaBZIWl.js";import"./export-menu-Dc7p6f2N.js";import"./client-BPlDQ_w6.js";import"./markdown-preview-BraYX-Ir.js";import"./index.dom-D_wTd2ti.js";import"./file-text-lEESev82.js";import"./copy-NjjIHlT4.js";import"./file-code-corner-yYKcp4ZM.js";import"./loader-circle-Dq2PH5qo.js";import"./api-BkLxSoFZ.js";import"./folder-open-wGuJ88tr.js";import"./folder-BXGlRQYS.js";import"./tag-color-picker-BMXS6SBe.js";import"./project-tag-D-SziBud.js";import"./sparkles-CQQD-aG3.js";import"./brain-BJDu9YN0.js";import"./chevron-right-CaCrw2dY.js";import"./markdown-editor-BWVUQUAc.js";import"./pencil-Cmqlcza3.js";import"./trash-2-BYAr9W69.js";import"./templates-B6M1OYb3.js";import"./plus-C6ET506f.js";import"./task-row-BJJiJH_4.js";import"./i18n-labels-BgDfCHFa.js";import"./selectable-icon-BALPNbHG.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-BnZPdT0f.js";import"./arrow-left-Dq4kFlHl.js";var s,c,p,l,d,m,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ya={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
