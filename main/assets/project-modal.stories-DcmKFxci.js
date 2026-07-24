import{aU as n,av as R}from"./iframe-RUxLRQ-W.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-DbFfY0JV.js";import{P as H}from"./project-modal-9Dgg6bUL.js";import"./preload-helper-Dp1pzeXC.js";import"./index-Cnf_ucsT.js";import"./Select-ef7c0426.esm-DieGl5RV.js";import"./chevron-down-Cu0JHjja.js";import"./check-xk4V8668.js";import"./index-CCiKSgr9.js";import"./triangle-alert-ifnqry6t.js";import"./export-menu-Djg1WusX.js";import"./client-B8Wv9_CC.js";import"./markdown-preview-C0l9Qa83.js";import"./index.dom-D_wTd2ti.js";import"./file-text-D0XNEdwL.js";import"./copy-BQjqGW7G.js";import"./file-code-corner-DVMcjwB-.js";import"./loader-circle-Ct7d1Gtq.js";import"./api-BzV0Zzg-.js";import"./folder-open-HuQ4NI8S.js";import"./folder-Dyj0Gsf4.js";import"./tag-color-picker-Chma4cpm.js";import"./project-tag-DgrZ3GE5.js";import"./sparkles-rTqupMnf.js";import"./brain-82mVNyyu.js";import"./chevron-right-B9HJ4kwQ.js";import"./markdown-editor-BF2LloE6.js";import"./pencil-DTKsX3u9.js";import"./trash-2-xW3ef78x.js";import"./templates-B6M1OYb3.js";import"./plus-D5620Ktc.js";import"./task-row-hsmI72IZ.js";import"./i18n-labels-D-H-Wyhr.js";import"./selectable-icon-DUXCEdeB.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-DnvmwST8.js";import"./arrow-left-k0qjSIqp.js";var s,c,p,l,d,m,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ya={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
