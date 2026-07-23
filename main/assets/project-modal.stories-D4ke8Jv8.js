import{aX as n,ax as R}from"./iframe-kOSyFTCP.js";import{c as N,q as x,k as B,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-ry9LyozV.js";import{P as H}from"./project-modal-_gRhDemq.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DBz4stYP.js";import"./Select-ef7c0426.esm-DOG2V_Ub.js";import"./chevron-down-DDQ69fp-.js";import"./check-Q-wKFI1j.js";import"./index-IkkZQbkP.js";import"./triangle-alert-8Rweub8r.js";import"./export-menu-BMuS3giI.js";import"./client-FAaF5yrJ.js";import"./markdown-preview-D5QEXK7J.js";import"./index.dom-D_wTd2ti.js";import"./file-text-BJF8JBw1.js";import"./copy-brtU1RyQ.js";import"./file-code-corner-Bw5ctqIl.js";import"./loader-circle-ggulxtxe.js";import"./api-DB4fVA5O.js";import"./folder-open-CDfq0egt.js";import"./folder-CMatzmv8.js";import"./tag-color-picker-DizOlE5S.js";import"./project-tag-fc0zPmqn.js";import"./sparkles-DVJdwr6f.js";import"./brain-BLyslAPq.js";import"./chevron-right-BhLgqrjt.js";import"./markdown-editor-CmRk3zqW.js";import"./pencil-CMXnMO3n.js";import"./trash-2-D6xU6A9X.js";import"./templates-B6M1OYb3.js";import"./plus-CJccFASS.js";import"./task-row-dIdraujz.js";import"./blocked-badge-DMIbsbft.js";import"./selectable-icon-JYbiDaZo.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-C7xQyTtS.js";import"./arrow-left-DoQYe-9I.js";var s,c,p,l,d,m,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ya={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[x,B],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[x,B]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
